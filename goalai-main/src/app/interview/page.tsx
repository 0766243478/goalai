"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "northStar" | "dailyWindow" | "friction" | "valueSkill";

const frictionOptions = [
  { value: "OVERTHINKING", label: "Overthinking" },
  { value: "ENERGY_CRASH", label: "Energy Crash" },
  { value: "DISTRACTION", label: "Distraction" },
];

const windowOptions = [15, 30, 45];

export default function Interview() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("northStar");
  const [northStar, setNorthStar] = useState("");
  const [dailyWindow, setDailyWindow] = useState(30);
  const [friction, setFriction] = useState("");
  const [valueSkill, setValueSkill] = useState("");
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ["northStar", "dailyWindow", "friction", "valueSkill"];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      handleFinish();
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          northStar,
          valueSkill,
          frictionTrigger: friction || "OVERTHINKING",
          dailyWindowMinutes: dailyWindow,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      
      router.push("/dashboard");
    } catch {
      setError("Unable to save your setup. Please try again.");
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-deep-blue rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Calibrating your engine.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-relief-bg">
      <div className="p-4">
        <div className="w-full bg-gray-100 rounded-full h-1 mb-1">
          <div
            className="bg-deep-blue h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center">
          {currentIndex + 1} of {steps.length}
        </p>
      </div>

      <main className="flex-1 flex flex-col justify-center p-6 max-w-lg mx-auto w-full">
        {step === "northStar" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What is the one 30-day objective that changes everything?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Your North Star.</p>
            <input
              type="text"
              value={northStar}
              onChange={(e) => setNorthStar(e.target.value)}
              placeholder="e.g., Launch the MVP, Close 3 clients..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent mb-4"
              autoFocus
            />
            <button
              onClick={goNext}
              disabled={!northStar.trim()}
              className="w-full bg-deep-blue text-white rounded-xl py-3 font-medium hover:bg-blue-900 transition-colors disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {step === "dailyWindow" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Minutes you can guarantee on your worst day?
            </h2>
            <p className="text-sm text-gray-400 mb-8">Your daily window.</p>
            <div className="flex justify-center gap-4 mb-8">
              {windowOptions.map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDailyWindow(mins)}
                  className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    dailyWindow === mins
                      ? "bg-deep-blue text-white shadow-lg scale-105"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-2xl font-bold">{mins}</span>
                  <span className="text-xs opacity-70">min</span>
                </button>
              ))}
            </div>
            <button
              onClick={goNext}
              className="w-full bg-deep-blue text-white rounded-xl py-3 font-medium hover:bg-blue-900 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === "friction" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Why do you usually stop?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Your friction trigger.</p>
            <div className="space-y-3 mb-6">
              {frictionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFriction(option.value)}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all ${
                    friction === option.value
                      ? "border-deep-blue bg-blue-50 text-deep-blue"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={goNext}
              disabled={!friction}
              className="w-full bg-deep-blue text-white rounded-xl py-3 font-medium hover:bg-blue-900 transition-colors disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        )}

        {step === "valueSkill" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              What is your primary income-generating skill?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Your value skill.</p>
            <input
              type="text"
              value={valueSkill}
              onChange={(e) => setValueSkill(e.target.value)}
              placeholder="e.g., Design, Sales, Writing, Development..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-deep-blue focus:border-transparent mb-4"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-xs text-center mb-4">{error}</p>
            )}
            <button
              onClick={goNext}
              disabled={!valueSkill.trim()}
              className="w-full bg-deep-blue text-white rounded-xl py-3 font-medium hover:bg-blue-900 transition-colors disabled:opacity-30"
            >
              Finish
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
