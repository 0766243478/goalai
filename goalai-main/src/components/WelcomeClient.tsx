"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function WelcomeClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signup" | "signin" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignUp = async () => {
    setBusy("signup");
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.user?.email_confirmed_at == null) {
        router.push("/verify-email");
        return;
      }
      router.push("/onboarding");
    } catch {
      setError("Unable to sign up. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleSignIn = async () => {
    setBusy("signin");
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.user?.email_confirmed_at == null) {
        router.push("/verify-email");
        return;
      }
      router.push("/onboarding");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
      <div
        className={`transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Gan Network" width={64} height={64} className="object-contain" />
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 text-center mb-3">
          Gan Network
        </h1>

        <p className="text-gray-400 text-center max-w-xs mx-auto mb-12 text-sm leading-relaxed">
          Stop deciding. Start executing.
          <br />3 tasks. Every day. Calibrated to you.
        </p>
      </div>

      <div
        className={`w-full max-w-xs transition-all duration-700 delay-300 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent"
            autoComplete="current-password"
          />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleSignUp}
            disabled={!email.trim() || password.length < 6 || busy !== null}
            className="w-full bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {busy === "signup" ? "Creating account" : "Sign up"}
          </button>
          <button
            onClick={handleSignIn}
            disabled={!email.trim() || password.length < 6 || busy !== null}
            className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl text-base py-4 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {busy === "signin" ? "Signing in" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
