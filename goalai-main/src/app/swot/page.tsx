import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import SwotWizard from "./SwotWizard";

export default async function SwotPage() {
  const GUEST_COOKIE = 'goalai_guest';

  let userId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      if (data.user.email_confirmed_at == null) redirect("/verify-email");
      userId = data.user.id;
    }
  } catch {
    // Supabase unavailable
  }

  if (!userId) {
    try {
      const cookieStore = await cookies();
      const guestId = cookieStore.get(GUEST_COOKIE)?.value;
      if (guestId) {
        const dbUser = await prisma.user.findUnique({ where: { id: guestId } });
        if (dbUser) userId = dbUser.id;
      }
    } catch {}
  }

  if (!userId) redirect("/");

  let swot = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
    weaknessesOvercome: [] as string[],
    threatsResolved: [] as string[],
  };

  try {
    const profile = await prisma.swotProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      swot = {
        strengths: JSON.parse(profile.strengths || "[]"),
        weaknesses: JSON.parse(profile.weaknesses || "[]"),
        opportunities: JSON.parse(profile.opportunities || "[]"),
        threats: JSON.parse(profile.threats || "[]"),
        weaknessesOvercome: JSON.parse(profile.weaknessesOvercome || "[]"),
        threatsResolved: JSON.parse(profile.threatsResolved || "[]"),
      };
    }
  } catch {
    // ignore
  }

  return (
    <main className="min-h-screen bg-relief-bg px-6 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Your Strategic Profile</h1>
        <p className="text-sm text-gray-500 mb-6">GoalAI uses your SWOT to build a personalized daily engine.</p>
        <SwotWizard initial={swot} />
      </div>
    </main>
  );
}
