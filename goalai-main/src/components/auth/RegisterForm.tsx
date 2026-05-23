"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Unable to sign up.";
        if (msg.includes("already registered") || msg.includes("already exists")) {
          setError("An account with this email already exists.");
        } else if (msg.includes("Password must be")) {
          setError(msg);
        } else {
          setError(msg);
        }
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Unable to sign up. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#233dff] focus:border-transparent";

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
            className={inputClass}
            autoComplete="email"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className={`${inputClass} pr-12`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#233dff] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            onClick={handleSignUp}
            disabled={!email.trim() || password.length < 6 || busy}
            className="w-full bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {busy ? "Creating account..." : "Sign up"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-[#233dff] font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
