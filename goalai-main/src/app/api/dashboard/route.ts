import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

export async function GET() {
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ user: null, tasks: [], day0: null }),
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
      orderBy: { orderIndex: 'asc' },
    });

    return applySupabaseCookies(
      NextResponse.json({
      user: {
        id: user.id,
        northStar: user.northStar,
        valueSkill: user.valueSkill,
        dailyWindowMinutes: user.dailyWindowMinutes,
      },
      tasks: todayTasks,
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
