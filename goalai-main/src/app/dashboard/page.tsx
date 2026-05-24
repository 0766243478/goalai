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
  const GUEST_COOKIE = 'gaolaif_guest';

  // Try Supabase auth first
  let userId: string | null = null;
  let needsEmailConfirm = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      needsEmailConfirm = data.user.email_confirmed_at == null;
      userId = data.user.id;
    }
  } catch {
    // Supabase unavailable — continue to fallback
  }

  if (needsEmailConfirm) redirect("/verify-email");

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
