import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import WelcomeClient from "@/components/WelcomeClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Welcome() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;

  if (authUser?.email_confirmed_at == null && authUser) {
    redirect("/verify-email");
  }

  if (authUser) {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { northStar: true },
    });
    if (user?.northStar) {
      redirect("/dashboard");
    }
  }

  return <WelcomeClient />;
}
