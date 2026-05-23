import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import WelcomeClient from "@/components/WelcomeClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Welcome() {
  let authUser: { id: string; email_confirmed_at: string | null } | null = null;

  try {
    const supabase = await createSupabaseServerClient({ timeoutMs: 4000 });
    const { data } = await supabase.auth.getUser();
    authUser = data.user ? { id: data.user.id, email_confirmed_at: data.user.email_confirmed_at } : null;
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
      // DB unavailable — proceed to welcome page
    }
  }

  return <WelcomeClient />;
}
