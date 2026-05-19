import { NextResponse } from 'next/server';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST() {
  const { supabase, cookiesToSet } = await createSupabaseRouteClient();
  await supabase.auth.signOut();
  return applySupabaseCookies(NextResponse.json({ success: true }), cookiesToSet);
}
