import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';

export async function GET() {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), cookiesToSet);
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { northStar: true, valueSkill: true, frictionTrigger: true, dailyWindowMinutes: true, createdAt: true },
    });

    return applySupabaseCookies(NextResponse.json({ user: dbUser }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), cookiesToSet);
    }

    let body: {
      northStar?: string;
      valueSkill?: string;
      frictionTrigger?: string;
      dailyWindowMinutes?: number;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        ...(body.northStar !== undefined && { northStar: body.northStar }),
        ...(body.valueSkill !== undefined && { valueSkill: body.valueSkill }),
        ...(body.frictionTrigger !== undefined && { frictionTrigger: body.frictionTrigger }),
        ...(body.dailyWindowMinutes !== undefined && { dailyWindowMinutes: body.dailyWindowMinutes }),
      },
    });

    return applySupabaseCookies(NextResponse.json({ success: true }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to save user settings' }, { status: 500 });
  }
}
