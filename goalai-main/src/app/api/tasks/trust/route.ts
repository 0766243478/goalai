import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';

export async function GET() {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(
        NextResponse.json({ its: 0.5, trust_score: 500, loadMultiplier: 1.0 }),
        cookiesToSet
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { internalTrustScore: true, trustScore: true, loadMultiplier: true },
    });

    if (!user) {
      return applySupabaseCookies(
        NextResponse.json({ its: 0.5, trust_score: 500, loadMultiplier: 1.0 }),
        cookiesToSet
      );
    }

    return applySupabaseCookies(
      NextResponse.json({
      its: user.internalTrustScore,
      trust_score: user.trustScore,
      loadMultiplier: user.loadMultiplier,
      }),
      cookiesToSet
    );
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trust metrics' }, { status: 500 });
  }
}
