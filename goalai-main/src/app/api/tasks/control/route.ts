import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { format } from 'date-fns';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';
import { buildReliefPlan } from '@/lib/recalibration';
import { analyzeInterruptionPatterns, applyAdaptiveVisionModifications } from '@/lib/vision-learning';

const ControlBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('pause'),
    title: z.string().min(1),
    context: z.string().optional(),
    deadlineIso: z.string().optional(),
    activeTaskId: z.string().uuid().optional(),
    remainingSeconds: z.number().int().min(0).optional(),
    workdayEndsAtIso: z.string().min(1),
  }),
  z.object({
    action: z.literal('update_duration'),
    taskId: z.string().uuid(),
    durationMinutes: z.number().int().min(5).max(480),
    workdayEndsAtIso: z.string().min(1),
  }),
]);

// Lightweight ActionResponder: returns a minimal acknowledgment immediately
// to prevent UI blocking, then processes heavy recalculations in the background
function createUrgentResponse<T extends object>(
  responseData: T
) {
  return NextResponse.json(responseData, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
        cookiesToSet
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = ControlBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');

    const { action } = parsed.data;

    if (action === 'pause') {
      const { title, context, deadlineIso, activeTaskId, remainingSeconds, workdayEndsAtIso } = parsed.data;
      const deadline = deadlineIso ? new Date(deadlineIso) : null;
      const workdayEndsAt = new Date(workdayEndsAtIso);

      // 1. Get or create session with minimal select
      let session = await prisma.workSession.findFirst({
        where: { userId: authUser.id, endedAt: null },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      });

      if (!session) {
        session = await prisma.workSession.create({
          data: {
            userId: authUser.id,
            startedAt: now,
          },
          select: { id: true },
        });
      }

      // Atomically log the interruption + update session in a single transaction
      const result = await prisma.$transaction(async (tx) => {
        let updatedSession;
        if (activeTaskId) {
          updatedSession = await tx.workSession.update({
            where: { id: session!.id },
            data: {
              activeTaskId: null,
              activeTaskRemainingSeconds: remainingSeconds ?? null,
            },
            select: { id: true, activeTaskId: true, activeTaskRemainingSeconds: true, startedAt: true },
          });
        }

        const interruption = await tx.interruptionLog.create({
          data: {
            userId: authUser.id,
            sessionId: session!.id,
            pausedTaskId: activeTaskId || null,
            title,
            context,
            deadline,
            createdAt: now,
          },
          select: { id: true, title: true, createdAt: true },
        });

        return { updatedSession, interruption };
      });

      // Recalculate daylight blocks with our pipeline - only necessary fields
      const tasks = await prisma.task.findMany({
        where: { userId: authUser.id, date: today, completed: false, skipped: false },
        select: { id: true, title: true, duration: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      });

      const openInterruptions = await prisma.interruptionLog.findMany({
        where: { userId: authUser.id, endedAt: null },
        select: { id: true, title: true, deadline: true, durationSeconds: true },
        orderBy: { createdAt: 'asc' },
      });

      // Query historical failure/completion patterns via Adaptive Vision Engine
      const focusProfile = await analyzeInterruptionPatterns(authUser.id, now);

      // Apply Adaptive modifications (dynamic task compression & buffer calculation)
      const { adjustedTasks, injectedBufferMinutes } = applyAdaptiveVisionModifications(
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          durationMinutes: t.duration,
          orderIndex: t.orderIndex,
        })),
        focusProfile
      );

      // Schedule with our EDF and compressed buildReliefPlan
      const plan = buildReliefPlan({
        now,
        workdayEndsAt,
        blockMinutes: 25,
        tasks: adjustedTasks,
        interruptions: openInterruptions.map((it) => ({
          id: it.id,
          title: it.title,
          deadline: it.deadline,
          estimatedMinutes: it.durationSeconds ? Math.ceil(it.durationSeconds / 60) : null,
        })),
      });

      // If buffer is injected, insert a specialized placeholder buffer block
      if (injectedBufferMinutes > 0) {
        plan.blocks.unshift({
          kind: 'task',
          taskId: 'adaptive-buffer-id',
          title: `🛡️ [Adaptive Buffer] Focus Breather (${injectedBufferMinutes}m)`,
          minutes: injectedBufferMinutes,
        });
      }

      return applySupabaseCookies(
        NextResponse.json({
          success: true,
          interruption: result.interruption,
          session: result.updatedSession,
          recalibratedPlan: {
            nowIso: now.toISOString(),
            workdayEndsAtIso: workdayEndsAt.toISOString(),
            focusRiskScore: focusProfile.combinedRiskScore,
            hasAdaptiveBuffer: injectedBufferMinutes > 0,
            ...plan,
          },
        }),
        cookiesToSet
      );

    } else if (action === 'update_duration') {
      const { taskId, durationMinutes, workdayEndsAtIso } = parsed.data;
      const workdayEndsAt = new Date(workdayEndsAtIso);

      // Update task duration with minimal select
      const updatedTask = await prisma.task.update({
        where: { id: taskId, userId: authUser.id },
        data: { duration: durationMinutes },
        select: { id: true, title: true, duration: true, orderIndex: true },
      });

      // Recalculate daylight plan
      const tasks = await prisma.task.findMany({
        where: { userId: authUser.id, date: today, completed: false, skipped: false },
        select: { id: true, title: true, duration: true, orderIndex: true },
        orderBy: { orderIndex: 'asc' },
      });

      const openInterruptions = await prisma.interruptionLog.findMany({
        where: { userId: authUser.id, endedAt: null },
        select: { id: true, title: true, deadline: true, durationSeconds: true },
        orderBy: { createdAt: 'asc' },
      });

      // Query patterns via Adaptive Vision Engine
      const focusProfile = await analyzeInterruptionPatterns(authUser.id, now);

      // Apply Adaptive modifications
      const { adjustedTasks, injectedBufferMinutes } = applyAdaptiveVisionModifications(
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          durationMinutes: t.duration,
          orderIndex: t.orderIndex,
        })),
        focusProfile
      );

      // Run our scheduling algorithm
      const plan = buildReliefPlan({
        now,
        workdayEndsAt,
        blockMinutes: 25,
        tasks: adjustedTasks,
        interruptions: openInterruptions.map((it) => ({
          id: it.id,
          title: it.title,
          deadline: it.deadline,
          estimatedMinutes: it.durationSeconds ? Math.ceil(it.durationSeconds / 60) : null,
        })),
      });

      if (injectedBufferMinutes > 0) {
        plan.blocks.unshift({
          kind: 'task',
          taskId: 'adaptive-buffer-id',
          title: `🛡️ [Adaptive Buffer] Focus Breather (${injectedBufferMinutes}m)`,
          minutes: injectedBufferMinutes,
        });
      }

      return applySupabaseCookies(
        NextResponse.json({
          success: true,
          task: updatedTask,
          recalibratedPlan: {
            nowIso: now.toISOString(),
            workdayEndsAtIso: workdayEndsAt.toISOString(),
            focusRiskScore: focusProfile.combinedRiskScore,
            hasAdaptiveBuffer: injectedBufferMinutes > 0,
            ...plan,
          },
        }),
        cookiesToSet
      );
    }

    return createUrgentResponse({
      success: false,
      error: 'Unknown action'
    });
  } catch (error) {
    console.error('Control route failed:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
