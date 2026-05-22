import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, getAuthenticatedUser } from '@/lib/supabase/route';

async function getSwotData(userId: string) {
  const swot = await prisma.swotProfile.findUnique({ where: { userId } });
  if (!swot) return null;
  return {
    id: swot.id,
    strengths: JSON.parse(swot.strengths || '[]'),
    weaknesses: JSON.parse(swot.weaknesses || '[]'),
    opportunities: JSON.parse(swot.opportunities || '[]'),
    threats: JSON.parse(swot.threats || '[]'),
    weaknessesOvercome: JSON.parse(swot.weaknessesOvercome || '[]'),
    threatsResolved: JSON.parse(swot.threatsResolved || '[]'),
  };
}

export async function GET() {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), cookiesToSet);
    }

    const swot = await getSwotData(authUser.id);
    if (!swot) {
      return applySupabaseCookies(NextResponse.json({
        strengths: [], weaknesses: [], opportunities: [], threats: [],
        weaknessesOvercome: [], threatsResolved: [],
      }), cookiesToSet);
    }

    return applySupabaseCookies(NextResponse.json(swot), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch SWOT profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, cookiesToSet } = await getAuthenticatedUser();
    if (!authUser) {
      return applySupabaseCookies(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), cookiesToSet);
    }

    let body: {
      strengths?: string[]; weaknesses?: string[];
      opportunities?: string[]; threats?: string[];
      weaknessesOvercome?: string[]; threatsResolved?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    await prisma.swotProfile.upsert({
      where: { userId: authUser.id },
      create: {
        userId: authUser.id,
        strengths: JSON.stringify(body.strengths || []),
        weaknesses: JSON.stringify(body.weaknesses || []),
        opportunities: JSON.stringify(body.opportunities || []),
        threats: JSON.stringify(body.threats || []),
        weaknessesOvercome: JSON.stringify(body.weaknessesOvercome || []),
        threatsResolved: JSON.stringify(body.threatsResolved || []),
      },
      update: {
        strengths: JSON.stringify(body.strengths || []),
        weaknesses: JSON.stringify(body.weaknesses || []),
        opportunities: JSON.stringify(body.opportunities || []),
        threats: JSON.stringify(body.threats || []),
        weaknessesOvercome: JSON.stringify(body.weaknessesOvercome || []),
        threatsResolved: JSON.stringify(body.threatsResolved || []),
      },
    });

    return applySupabaseCookies(NextResponse.json({ success: true }), cookiesToSet);
  } catch {
    return NextResponse.json({ error: 'Failed to save SWOT profile' }, { status: 500 });
  }
}
