import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Welcome() {
  let authUser: { id: string; email_confirmed_at: string | null } | null = null;

  try {
    const supabase = await createSupabaseServerClient({ timeoutMs: 4000 });
    const { data } = await supabase.auth.getUser();
    authUser = data.user ? { id: data.user.id, email_confirmed_at: data.user.email_confirmed_at ?? null } : null;
  } catch {
    // Supabase unavailable — proceed unauthenticated
  }

  if (authUser?.email_confirmed_at == null && authUser) {
    redirect("/verify-email");
  }

  if (authUser) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { northStar: true },
      });
      if (user?.northStar) {
        redirect("/dashboard");
      }
    } catch {
      // DB unavailable — proceed to landing
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
      <div className="mb-8 flex justify-center">
        <h1 className="text-3xl font-semibold text-gray-900 text-center">GoalAI</h1>
      </div>

      <p className="text-gray-400 text-center max-w-xs mx-auto mb-12 text-sm leading-relaxed">
        Stop deciding. Start executing.
        <br />3 tasks. Every day. Calibrated to you.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Link
          href="/login"
          className="block w-full bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors text-center"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="block w-full bg-white text-gray-900 border border-gray-200 rounded-xl text-base py-4 font-medium hover:bg-gray-50 transition-colors text-center"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
