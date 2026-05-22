import { NextResponse } from 'next/server';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';
import { GUEST_COOKIE } from '@/lib/dev-auth';

export async function POST() {
  let response = NextResponse.json({ success: true });

  // Sign out of Supabase
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    await supabase.auth.signOut();
    response = applySupabaseCookies(response, cookiesToSet);
  } catch {
    // Supabase unavailable — proceed to clear guest cookie
  }

  // Clear the guest/dev session cookie
  response.cookies.set(GUEST_COOKIE, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
