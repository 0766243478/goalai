import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type CookieToSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  const cookiesToSet: CookieToSet[] = [];

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookies) {
        for (const cookie of cookies) {
          cookiesToSet.push({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options ?? {},
          });
        }
      },
    },
  });

  return { supabase, cookiesToSet };
}

export function applySupabaseCookies(response: NextResponse, cookiesToSet: CookieToSet[]) {
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}

const GUEST_COOKIE = 'goalai_guest';

/**
 * Tries Supabase auth first, then falls back to the guest/dev cookie session.
 * Returns a normalized user object regardless of auth method.
 */
export async function getAuthenticatedUser(): Promise<{
  user: { id: string; email?: string; email_confirmed_at?: string | null } | null;
  cookiesToSet: CookieToSet[];
}> {
  // Try Supabase first
  try {
    const { supabase, cookiesToSet } = await createSupabaseRouteClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return { user: data.user, cookiesToSet };
    }
  } catch {
    // Supabase unavailable — continue to guest fallback
  }

  // Fallback: check for guest/dev session cookie
  try {
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE)?.value;
    if (guestId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: guestId },
        select: { id: true, email: true },
      });
      if (dbUser) {
        return {
          user: { id: dbUser.id, email: dbUser.email ?? undefined, email_confirmed_at: new Date().toISOString() },
          cookiesToSet: [],
        };
      }
    }
  } catch {
    // Cookie read failed
  }

  return { user: null, cookiesToSet: [] };
}
