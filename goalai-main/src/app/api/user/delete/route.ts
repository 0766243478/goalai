import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

export async function DELETE() {
  const { supabase, cookiesToSet } = await createSupabaseRouteClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) {
    return applySupabaseCookies(
      NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      cookiesToSet
    );
  }

  try {
    await prisma.$transaction([
      prisma.trustEvent.deleteMany({ where: { userId: authUser.id } }),
      prisma.task.deleteMany({ where: { userId: authUser.id } }),
      prisma.user.delete({ where: { id: authUser.id } }),
    ]);
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  await supabase.auth.signOut();
  return applySupabaseCookies(NextResponse.json({ success: true }), cookiesToSet);
}
