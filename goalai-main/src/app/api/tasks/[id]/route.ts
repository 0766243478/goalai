import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  calculateHonestyScore,
  calculateITS,
  calculateLoadMultiplier,
  generateCommitmentHash,
  generateTaskRootHash,
} from '@/lib/trust';
import { format } from 'date-fns';
import { z } from 'zod';
import { generateIntegrityHash, getIntegrityWindowRetryAfterSeconds } from '@/lib/gan-logic';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';
import type { Prisma } from '@prisma/client';

const PatchBodySchema = z
  .object({
    completed: z.boolean().optional(),
    skipped: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = PatchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { completed, skipped } = parsed.data;
    if (completed !== true && skipped !== true) {
      return NextResponse.json({ error: 'No state change provided' }, { status: 400 });
    }

    const now = new Date();
    const updatedTask = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const task = await tx.task.findFirst({
        where: { id, userId: authUser.id },
      });

      if (!task) {
        return null;
      }

      if (completed === true && !task.completed) {
        const elapsedMinutes = (now.getTime() - new Date(task.createdAt).getTime()) / 60000;
        if (task.duration >= 22 && elapsedMinutes < 15) {
          const retryAfter = getIntegrityWindowRetryAfterSeconds({
            createdAt: new Date(task.createdAt),
            now,
            minimumMinutes: 15,
          });
          throw new Error(`VELOCITY_CHECK_FAILED:${retryAfter}`);
        }
      }

      const updateResult = await tx.task.updateMany({
        where: { id, userId: authUser.id },
        data: {
          completed: completed ?? task.completed,
          completedAt: completed === true && !task.completed ? now : task.completedAt,
          skipped: skipped ?? task.skipped,
        },
      });
      if (updateResult.count !== 1) {
        return null;
      }

      const updated = await tx.task.findFirst({
        where: { id, userId: authUser.id },
      });
      if (!updated) {
        return null;
      }

      if (completed === true && !task.completed) {
        const taskIntegrityHash = generateIntegrityHash({
          userId: authUser.id,
          taskId: id,
          completedAt: now.toISOString(),
        });
        await tx.user.update({
          where: { id: authUser.id },
          data: { integrityHash: taskIntegrityHash },
        });
      }

      const today = format(now, 'yyyy-MM-dd');
      const todayTasks = await tx.task.findMany({
        where: { userId: authUser.id, date: today, isDay0: false },
        select: {
          id: true,
          orderIndex: true,
          type: true,
          title: true,
          duration: true,
          completed: true,
          skipped: true,
          createdAt: true,
          completedAt: true,
        },
      });

        const allResolved =
          todayTasks.length > 0 && todayTasks.every((t) => t.completed || t.skipped);
      if (allResolved) {
        const completedCount = todayTasks.filter((t) => t.completed).length;
        const skippedCount = todayTasks.filter((t) => t.skipped).length;
        const totalCount = todayTasks.length;

        const completionRate = completedCount / totalCount;
        const skipRate = skippedCount / totalCount;
        const honestyScores = todayTasks.map((t) => {
          if (!t.completed || !t.completedAt) return 0;
          const timeOnTaskMinutes =
            (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
          return calculateHonestyScore(timeOnTaskMinutes, t.duration);
        });
        const avgHonesty =
          honestyScores.reduce((sum, v) => sum + v, 0) / Math.max(1, honestyScores.length);

        const avgDuration = todayTasks.reduce((sum, t) => sum + t.duration, 0) / totalCount;
        const complexityScore = Math.max(0, Math.min(1, avgDuration / 45));

        const user = await tx.user.findUnique({
          where: { id: authUser.id },
          select: {
            internalTrustScore: true,
            loadMultiplier: true,
            consecutiveFullDays: true,
            createdAt: true,
          },
        });

        if (user) {
          const ageDays = Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / 86400000);
          const newITS = calculateITS(user.internalTrustScore, {
            completionRate,
            skipRate,
            avgHonesty,
            complexityScore,
            ageDays,
          });

          const adaptation = calculateLoadMultiplier(
            completedCount,
            totalCount,
            user.consecutiveFullDays,
            user.loadMultiplier
          );

          await tx.user.update({
            where: { id: authUser.id },
            data: {
              internalTrustScore: newITS,
              trustScore: Math.round(newITS * 1000),
              loadMultiplier: adaptation.loadMultiplier,
              consecutiveFullDays: adaptation.consecutiveFullDays,
            },
          });

          const existingAnchor = await tx.trustEvent.findFirst({
            where: { userId: authUser.id, date: today, type: 'DAY_COMMITMENT' },
            select: { id: true },
          });

          if (!existingAnchor) {
            const taskRootHash = generateTaskRootHash(todayTasks);
            const integrityHash = generateCommitmentHash({
              userId: authUser.id,
              date: today,
              currentITS: newITS,
              taskRootHash,
            });

            await tx.trustEvent.create({
              data: {
                userId: authUser.id,
                type: 'DAY_COMMITMENT',
                value: newITS,
                date: today,
                metadata: JSON.stringify({
                  taskRootHash,
                  completedCount,
                  skippedCount,
                  totalCount,
                  completionRate,
                  skipRate,
                  avgHonesty,
                  complexityScore,
                }),
                integrityHash,
              },
            });

            await tx.user.update({
              where: { id: authUser.id },
              data: { integrityHash },
            });
          }
        }
      }

      if (task.isDay0 && completed === true && !task.completed) {
        await tx.user.update({
          where: { id: authUser.id },
          data: { day0CompletedAt: now },
        });
      }

      return updated;
    });

    if (!updatedTask) {
      return applySupabaseCookies(NextResponse.json({ error: 'Task not found' }, { status: 404 }), cookiesToSet);
    }

    return applySupabaseCookies(NextResponse.json({ task: updatedTask }), cookiesToSet);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('VELOCITY_CHECK_FAILED')) {
      const retryAfter = Number(error.message.split(':')[1] ?? 0);
      return NextResponse.json(
        {
          error: 'Task completion too fast',
          retry_after: Number.isFinite(retryAfter) ? retryAfter : 0,
        },
        { status: 429, headers: { 'Retry-After': String(Number.isFinite(retryAfter) ? retryAfter : 0) } }
      );
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}
