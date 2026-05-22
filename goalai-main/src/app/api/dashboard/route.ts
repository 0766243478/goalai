import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';

export async function GET() {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ user: null, tasks: [], day0: null }),
        cookiesToSet
      );
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        northStar: true,
        valueSkill: true,
        dailyWindowMinutes: true,
        createdAt: true,
        surveyCompletedAt: true,
        lastOpenedAt: true,
      },
    });

    if (!user) {
      return applySupabaseCookies(
        NextResponse.json({ user: null, tasks: [], day0: null }),
        cookiesToSet
      );
    }

    const now = new Date();
    const shouldUpdateLastOpened =
      !user.lastOpenedAt || now.getTime() - new Date(user.lastOpenedAt).getTime() > 15 * 60 * 1000;
    if (shouldUpdateLastOpened) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { lastOpenedAt: now },
      });
    }



    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const showSurvey = daysSinceCreation >= 8 && !user.surveyCompletedAt;

    const todayTasks = await prisma.task.findMany({
      where: { userId: authUser.id, date: today, isDay0: false },
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

    // Only return active (non-completed, non-skipped) tasks to the frontend
    const activeTasks = todayTasks.filter((t) => !t.completed && !t.skipped);
    const allTasksCompleted = todayTasks.length > 0 && todayTasks.every((t) => t.completed || t.skipped);

    return applySupabaseCookies(
      NextResponse.json({
        user: {
          id: user.id,
          northStar: user.northStar,
          valueSkill: user.valueSkill,
          dailyWindowMinutes: user.dailyWindowMinutes,
        },
        tasks: activeTasks,
        allTasksCompleted,
        day0: null,
        locked: false,
        showSurvey,
      }),
      cookiesToSet
    );
  } catch {
    return NextResponse.json({ error: 'Internal Server Error', tasks: [] }, { status: 500 });
  }
}
