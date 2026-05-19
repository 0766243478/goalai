"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SurveyStep = "emotion" | "failure" | "identity" | "done";

export default function Survey() {
  const router = useRouter();
  const [step, setStep] = useState<SurveyStep>("emotion");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSelect = (question: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const handleNext = async () => {
    if (step === "emotion") setStep("failure");
    else if (step === "failure") setStep("identity");
    else if (step === "identity") {
      setSaving(true);
      try {
        await fetch("/api/survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answers),
        });
        setStep("done");
      } catch {
        setSaving(false);
      }
    }
  };

  const isDisabled =
    (step === "emotion" && !answers.emotion) ||
    (step === "failure" && !answers.failure) ||
    (step === "identity" && !answers.identity);

  if (step === "done") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-relief-bg p-6">
        <div className="text-center max-w-sm">
          <p className="text-gray-900 font-medium text-lg mb-2">Noted.</p>
          <p className="text-gray-400 text-sm mb-8">
            Your feedback refines the engine. Back to your path.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-relief-bg">
      <div className="p-4">
        <p className="text-xs text-gray-400 text-center">Quiet Pulse Check</p>
      </div>

      <main className="flex-1 flex flex-col justify-center p-6 max-w-lg mx-auto w-full">
        {step === "emotion" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              How do you feel when you open this app?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Be honest. No wrong answer.</p>
            <div className="space-y-3 mb-6">
              {["Relief", "Clarity", "Pressure"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect("emotion", option)}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all ${
                    answers.emotion === option
                      ? "border-deep-blue bg-blue-50 text-deep-blue"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "failure" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              After a 1/3 day, did you feel...
            </h2>
            <p className="text-sm text-gray-400 mb-6">When you completed fewer tasks.</p>
            <div className="space-y-3 mb-6">
              {["Supported", "Guilty"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect("failure", option)}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all ${
                    answers.failure === option
                      ? "border-deep-blue bg-blue-50 text-deep-blue"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "identity" && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Do you feel more like a &ldquo;Reliable Operator&rdquo;?
            </h2>
            <p className="text-sm text-gray-400 mb-6">Identity shift check.</p>
            <div className="space-y-3 mb-6">
              {["Yes", "Not yet"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect("identity", option)}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all ${
                    answers.identity === option
                      ? "border-deep-blue bg-blue-50 text-deep-blue"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={isDisabled || saving}
          className="w-full bg-deep-blue text-white rounded-xl py-3 font-medium hover:bg-blue-900 transition-colors disabled:opacity-30"
        >
          {saving ? "Saving..." : step === "identity" ? "Finish" : "Continue"}
        </button>
      </main>
    </div>
  );
}
