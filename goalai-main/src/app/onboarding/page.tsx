"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Onboarding() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-relief-bg">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="GoalAI" width={64} height={64} className="object-contain" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
          GoalAI
        </h1>

        <p className="text-gray-400 text-center mb-10 max-w-xs text-sm leading-relaxed">
          4 questions. 90 seconds.
          <br />
          Then the system takes over.
        </p>

        <div className="w-full max-w-sm space-y-4 mb-10">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-deep-blue flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold">1</span>
            </div>
            <p className="text-gray-600 text-sm">Define your 30-day objective</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-soft-purple flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold">2</span>
            </div>
            <p className="text-gray-600 text-sm">Get exactly 3 daily tasks. No more.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold">3</span>
            </div>
            <p className="text-gray-600 text-sm">The engine adapts. You just show up.</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/interview")}
          className="w-full max-w-sm bg-gray-900 text-white rounded-xl text-base py-4 font-medium hover:bg-gray-800 transition-colors"
        >
          Begin Setup
        </button>
      </main>
    </div>
  );
}
