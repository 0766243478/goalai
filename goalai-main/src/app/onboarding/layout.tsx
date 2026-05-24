import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Get Started - Setup in 90 Seconds",
  description:
    "Set up Gaolaif in 90 seconds. Answer 4 quick questions and start receiving 3 AI-generated daily tasks personalized to your goals and energy levels.",
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/");
  if (user.email_confirmed_at == null) redirect("/verify-email");
  return children;
}
