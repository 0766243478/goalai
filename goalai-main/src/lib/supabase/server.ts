import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient(input?: { timeoutMs?: number }) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const timeoutMs = input?.timeoutMs ?? 5000;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createServerClient(url, anonKey, {
    global: {
      fetch: (requestInfo: RequestInfo | URL, requestInit?: RequestInit) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const hasAny = typeof AbortSignal !== 'undefined' && 'any' in AbortSignal;
        const signal =
          requestInit?.signal && hasAny
            ? (AbortSignal as typeof AbortSignal & { any: (signals: AbortSignal[]) => AbortSignal }).any([
                requestInit.signal,
                controller.signal,
              ])
            : requestInit?.signal ?? controller.signal;

        return fetch(requestInfo, { ...requestInit, signal }).finally(() => clearTimeout(timeoutId));
      },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        return;
      },
    },
  });
}
