"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  northStar: string | null;
  valueSkill: string | null;
  frictionTrigger: string;
  dailyWindowMinutes: number;
  createdAt: string;
}

const frictionLabels: Record<string, string> = {
  OVERTHINKING: "Overthinking",
  ENERGY_CRASH: "Energy Crash",
  DISTRACTION: "Distraction",
};

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/");
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/user/signout", { method: "POST" });
      router.replace("/");
    } catch {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch("/api/user/delete", { method: "DELETE" });
      router.replace("/");
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-relief-bg">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-deep-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const memberSince = format(new Date(user.createdAt), "MMMM d, yyyy");

  return (
    <div className="min-h-screen bg-relief-bg">
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-medium text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6 space-y-6">
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Configuration</h2>
          <div className="space-y-0 divide-y divide-gray-100">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">North Star</span>
              <span className="text-sm text-gray-900 text-right max-w-[60%]">
                {user.northStar || "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Value Skill</span>
              <span className="text-sm text-gray-900">
                {user.valueSkill || "Not set"}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Friction Trigger</span>
              <span className="text-sm text-gray-900">
                {frictionLabels[user.frictionTrigger] || user.frictionTrigger}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Daily Window</span>
              <span className="text-sm text-gray-900">
                {user.dailyWindowMinutes} minutes
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Member Since</span>
              <span className="text-sm text-gray-900">{memberSince}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 pt-4">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Account</h2>
          <div className="space-y-2">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm"
              >
                Delete Account
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700 mb-3">
                  This will permanently delete all your data. This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-white text-gray-600 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
