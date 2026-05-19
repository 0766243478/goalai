import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { generateIntegrityHash } from '@/lib/gan-logic';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

const UserPostSchema = z
  .object({
    northStar: z.string().trim().min(1).max(140).optional(),
    valueSkill: z.string().trim().min(1).max(140).optional(),
    frictionTrigger: z.enum(['OVERTHINKING', 'ENERGY_CRASH', 'DISTRACTION']).optional(),
    dailyWindowMinutes: z.number().int().min(5).max(240).optional(),
  })
  .strict();

export async function GET() {
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ user: null }), cookiesToSet);
    }
    if (authUser.email_confirmed_at == null) {
      return applySupabaseCookies(
        NextResponse.json({ error: 'Email not verified' }, { status: 403 }),
        cookiesToSet
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    return applySupabaseCookies(NextResponse.json({ user }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const normalized = {
      northStar: body?.northStar ?? body?.north_star,
      valueSkill: body?.valueSkill ?? body?.value_skill,
      frictionTrigger: body?.frictionTrigger ?? body?.friction_trigger,
      dailyWindowMinutes: body?.dailyWindowMinutes ?? body?.daily_window_minutes,
    };

    const parsed = UserPostSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const northStar = parsed.data.northStar ?? null;
    const valueSkill = parsed.data.valueSkill ?? null;
    const frictionTrigger = parsed.data.frictionTrigger ?? 'OVERTHINKING';
    const dailyWindowMinutes = parsed.data.dailyWindowMinutes ?? 30;
    const integrityHash = generateIntegrityHash({
      northStar,
      valueSkill,
      frictionTrigger,
      dailyWindowMinutes,
      ts: new Date().toISOString(),
    });
    const user = await prisma.user.upsert({
      where: { id: authUser.id },
      update: {
        email: authUser.email ?? undefined,
        northStar,
        valueSkill,
        frictionTrigger,
        dailyWindowMinutes,
        integrityHash,
        isGuest: false,
      },
      create: {
        id: authUser.id,
        email: authUser.email ?? undefined,
        northStar,
        valueSkill,
        frictionTrigger,
        dailyWindowMinutes,
        integrityHash,
        isGuest: false,
      },
    });

    return applySupabaseCookies(NextResponse.json({ user }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
