"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        const msg = authError.message;
        if (msg.includes("Invalid login credentials")) {
          setError("Invalid email or password.");
        } else if (msg.includes("Email not confirmed")) {
          setError("Please confirm your email before signing in.");
        } else if (msg.includes("rate_limit")) {
          setError("Too many attempts. Please wait a moment.");
        } else {
          setError(msg);
        }
        return;
      }
      if (data.user?.email_confirmed_at == null) {
        router.push("/verify-email");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
      <div className="mb-8 flex justify-center">
        <h1 className="text-3xl font-semibold text-gray-900 text-center">GoalAI</h1>
      </div>

      <div className="w-full max-w-xs">
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
            onClick={handleSignIn}
            disabled={!email.trim() || busy}
            className="w-full bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-gray-900 font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
