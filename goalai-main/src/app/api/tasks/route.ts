import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTasks } from '@/lib/gemini';
import { format, subDays } from 'date-fns';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const CreateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  duration: z.number().int().min(5).max(480).optional(),
  type: z.enum(['EXECUTE', 'VALUE', 'RESET']).optional(),
  description: z.string().optional(),
  hook: z.string().optional(),
}).strict();

export async function GET() {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ tasks: [] }), cookiesToSet);
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const tasks = await prisma.task.findMany({
      where: { userId: authUser.id, date: today },
      select: {
        id: true,
        type: true,
        title: true,
        duration: true,
        hook: true,
        completed: true,
        skipped: true,
        isDay0: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    return applySupabaseCookies(NextResponse.json({ tasks }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks', tasks: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), cookiesToSet);
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Try to parse body — if it has a title, this is a custom Add Task request
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (body && typeof body === 'object' && (body as any)?.title) {
      // CUSTOM TASK CREATION (Add Task form)
      const parsed = CreateTaskSchema.safeParse(body);
      if (!parsed.success) {
        return applySupabaseCookies(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }), cookiesToSet);
      }

      const data = parsed.data!;
      const count = await prisma.task.count({ where: { userId: authUser.id, date: today } });
      const typeUpper = (data.type || 'EXECUTE').toUpperCase();
      const priority = data.priority || 'MEDIUM';

      const created = await prisma.task.create({
        data: {
          userId: authUser.id,
          date: today,
          type: typeUpper as 'EXECUTE' | 'VALUE' | 'RESET',
          title: data.title || 'New Task',
          description: data.description || data.title || 'New Task',
          duration: data.duration || 30,
          hook: data.hook || '',
          orderIndex: count,
        },
      });

      try {
        await prisma.taskPattern.create({
          data: {
            userId: authUser.id,
            taskType: typeUpper,
            title: (data.title || 'new task').trim().toLowerCase(),
            duration: data.duration || 30,
            priority: priority,
          },
        });
      } catch {
        // pattern storage non-critical
      }

      return applySupabaseCookies(NextResponse.json({ task: created }), cookiesToSet);
    }

    // LEGACY AI GENERATION (no body / Generate button)
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.task.findMany({
        where: { userId: authUser.id, date: today, isDay0: false },
        orderBy: { orderIndex: 'asc' },
      });

      if (existing.length > 0) {
        return { tasks: existing, existing: true as const };
      }

      const user = await tx.user.findUnique({
        where: { id: authUser.id },
        select: {
          northStar: true,
          valueSkill: true,
          frictionTrigger: true,
          dailyWindowMinutes: true,
          internalTrustScore: true,
          loadMultiplier: true,
        },
      });

      if (!user) {
        return { error: 'User not found' as const };
      }

      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const yesterdayTasks = await tx.task.findMany({
        where: { userId: authUser.id, date: yesterday, isDay0: false },
        select: { completed: true },
      });

      const yesterdayCompleted = yesterdayTasks.filter((t) => t.completed).length;
      const yesterdayTotal = yesterdayTasks.length;
      const yesterdayResult = yesterdayTotal > 0 ? `${yesterdayCompleted}/${yesterdayTotal}` : '0/0';

      const generated = await generateTasks(
        user.northStar || 'general productivity',
        user.valueSkill || 'primary skill',
        user.frictionTrigger,
        user.dailyWindowMinutes,
        user.internalTrustScore,
        user.loadMultiplier,
        yesterdayResult
      );

      const createdTasks = [];
      for (const [index, task] of generated.tasks.slice(0, 3).entries()) {
        createdTasks.push(
          await tx.task.create({
            data: {
              userId: authUser.id,
              date: today,
              type: task.type as 'EXECUTE' | 'VALUE' | 'RESET',
              title: task.title,
              description: task.title,
              duration: task.duration,
              hook: task.hook,
              orderIndex: index,
            },
          })
        );
      }

      return {
        tasks: createdTasks,
        header: generated.header,
        generated: true as const,
      };
    });

    if ('error' in result) {
      return applySupabaseCookies(NextResponse.json({ error: result.error }, { status: 404 }), cookiesToSet);
    }

    return applySupabaseCookies(NextResponse.json(result), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Task generation failed', tasks: [] }, { status: 500 });
  }
}
