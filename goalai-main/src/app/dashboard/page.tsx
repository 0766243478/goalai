import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";
import { DashboardHeaderSkeleton } from "./DashboardSkeleton";
import DashboardDataProvider from "./DashboardDataProvider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const GUEST_COOKIE = 'goalai_guest';

  // Try Supabase auth first
  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      if (data.user.email_confirmed_at == null) redirect("/verify-email");
      userId = data.user.id;
    }
  } catch (e) {
    // Re-throw redirect errors (NEXT_REDIRECT) so Next.js handles them
    if (typeof e === 'object' && e !== null && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    // Supabase unavailable — continue to fallback
  }

  // Fallback: guest/dev session
  if (!userId) {
    try {
      const cookieStore = await cookies();
      const guestId = cookieStore.get(GUEST_COOKIE)?.value;
      if (guestId) {
        const dbUser = await prisma.user.findUnique({ where: { id: guestId } });
        if (dbUser) {
          userId = dbUser.id;
        }
      }
    } catch {
      // Cookie read failed
    }
  }

  if (!userId) redirect("/");

  return (
    <DashboardDataProvider>
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardClient />
      </Suspense>
    </DashboardDataProvider>
  );
}
