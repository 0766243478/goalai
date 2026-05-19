import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

const SurveyBodySchema = z.record(z.string(), z.unknown());

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = SurveyBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const metadata = JSON.stringify(parsed.data);
  if (metadata.length > 10_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  await prisma.trustEvent.create({
    data: {
      userId: authUser.id,
      type: 'DAY8_SURVEY',
      value: 1,
      date: new Date().toISOString().split('T')[0],
      metadata,
    },
  });

  await prisma.user.update({
    where: { id: authUser.id },
    data: { surveyCompletedAt: new Date() },
  });

  return applySupabaseCookies(NextResponse.json({ success: true }), cookiesToSet);
}
