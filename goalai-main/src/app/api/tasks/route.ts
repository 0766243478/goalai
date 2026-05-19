import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTasks } from '@/lib/gemini';
import { format, subDays } from 'date-fns';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';
import type { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser || authUser.email_confirmed_at == null) {
      return applySupabaseCookies(NextResponse.json({ tasks: [] }), cookiesToSet);
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const tasks = await prisma.task.findMany({
      where: { userId: authUser.id, date: today },
      orderBy: { orderIndex: 'asc' },
    });

    return applySupabaseCookies(NextResponse.json({ tasks }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks', tasks: [] }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
        cookiesToSet
      );
    }
    if (authUser.email_confirmed_at == null) {
      return applySupabaseCookies(
        NextResponse.json({ error: 'Email not verified' }, { status: 403 }),
        cookiesToSet
      );
    }

    const today = format(new Date(), 'yyyy-MM-dd');
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
