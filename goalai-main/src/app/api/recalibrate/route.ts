import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { applySupabaseCookies, getAuthenticatedUser } from "@/lib/supabase/route";
import { buildReliefPlan } from "@/lib/recalibration";
import { analyzeInterruptionPatterns, applyAdaptiveVisionModifications } from "@/lib/vision-learning";

const RecalibrateSchema = z
  .object({
    workdayEndsAtIso: z.string().min(1),
    blockMinutes: z.number().int().min(10).max(120).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
        cookiesToSet
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = RecalibrateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const workdayEndsAt = new Date(parsed.data.workdayEndsAtIso);
    if (Number.isNaN(workdayEndsAt.getTime())) {
      return NextResponse.json({ error: "Invalid workdayEndsAtIso" }, { status: 400 });
    }

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    const tasks = await prisma.task.findMany({
      where: { userId: authUser.id, date: today, completed: false, skipped: false },
      select: { id: true, title: true, duration: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    });

    const openInterruptions = await prisma.interruptionLog.findMany({
      where: { userId: authUser.id, endedAt: null },
      select: { id: true, title: true, deadline: true, durationSeconds: true },
      orderBy: { createdAt: "asc" },
    });

    const focusProfile = await analyzeInterruptionPatterns(authUser.id, now);

    const { adjustedTasks, injectedBufferMinutes } = applyAdaptiveVisionModifications(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        durationMinutes: t.duration,
        orderIndex: t.orderIndex,
      })),
      focusProfile
    );

    const plan = buildReliefPlan({
      now,
      workdayEndsAt,
      blockMinutes: parsed.data.blockMinutes,
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
        kind: "task",
        taskId: "adaptive-buffer-id",
        title: `[Buffer] Focus Breather (${injectedBufferMinutes}m)`,
        minutes: injectedBufferMinutes,
      });
    }

    return applySupabaseCookies(
      NextResponse.json({
        nowIso: now.toISOString(),
        workdayEndsAtIso: workdayEndsAt.toISOString(),
        focusRiskScore: focusProfile.combinedRiskScore,
        hasAdaptiveBuffer: injectedBufferMinutes > 0,
        ...plan,
      }),
      cookiesToSet
    );
  } catch {
    return NextResponse.json({ error: "Recalibration failed" }, { status: 500 });
  }
}

