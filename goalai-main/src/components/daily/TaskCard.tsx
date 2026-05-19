"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskCardProps {
  task: {
    id: string;
    type: string;
    title: string;
    duration: number;
    hook: string;
    completed: boolean;
    skipped: boolean;
  };
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  retryAfterSeconds?: number;
}

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  EXECUTE: {
    label: "EXECUTE",
    color: "text-deep-blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  VALUE: {
    label: "VALUE",
    color: "text-soft-purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  RESET: {
    label: "RESET",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(15);
  }
}

export default function TaskCard({
  task,
  onComplete,
  onSkip,
  retryAfterSeconds = 0,
}: TaskCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [mistPhase, setMistPhase] = useState<"idle" | "desaturate" | "blur" | "logged" | "dissolve">("idle");
  const config = typeConfig[task.type] || typeConfig.EXECUTE;

  const formatCountdown = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(s / 60);
    const secs = s % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLocked = retryAfterSeconds > 0;

  useEffect(() => {
    if (task.completed && mistPhase === "idle") {
      setMistPhase("desaturate");
    }
  }, [task.completed, mistPhase]);

  useEffect(() => {
    if (isLocked && confirming) setConfirming(false);
  }, [isLocked, confirming]);

  useEffect(() => {
    if (mistPhase === "desaturate") {
      const timer = setTimeout(() => setMistPhase("blur"), 200);
      return () => clearTimeout(timer);
    }
    if (mistPhase === "blur") {
      const timer = setTimeout(() => setMistPhase("logged"), 400);
      return () => clearTimeout(timer);
    }
    if (mistPhase === "logged") {
      const timer = setTimeout(() => setMistPhase("dissolve"), 800);
      return () => clearTimeout(timer);
    }
  }, [mistPhase]);

  const handleComplete = () => {
    if (isLocked) return;
    if (confirming) {
      triggerHaptic();
      onComplete(task.id);
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  if (task.completed) {
    return (
      <AnimatePresence>
        {mistPhase !== "dissolve" && (
          <motion.div
            key="mist"
            initial={{ opacity: 1, filter: "blur(0px)" }}
            animate={{
              opacity: mistPhase === "blur" || mistPhase === "logged" ? 0.4 : 0.7,
              filter: mistPhase === "blur" || mistPhase === "logged" ? "blur(8px)" : "blur(0px)",
            }}
            exit={{ opacity: 0, filter: "blur(12px)" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={`${config.bg} ${config.border} border rounded-2xl p-5 relative`}
          >
            <div
              className="transition-all duration-200"
              style={{
                color: mistPhase === "desaturate" || mistPhase === "blur" || mistPhase === "logged" ? "#9ca3af" : undefined,
              }}
            >
              <p className="text-sm">{task.title}</p>
            </div>
            {mistPhase === "logged" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <p className="text-sm font-medium text-gray-500">Logged.</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (task.skipped) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
      >
        <p className="text-sm text-gray-400 line-through">{task.title}</p>
        <p className="text-xs text-gray-300 mt-1">Pattern detected. Refining flow.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`bg-white ${config.border} border rounded-2xl p-5 shadow-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-semibold tracking-widest uppercase ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-400">{task.duration} min</span>
      </div>

      <p className="text-gray-900 font-medium leading-relaxed mb-2">
        {task.title}
      </p>

      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        {task.hook}
      </p>

      {isLocked && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-[11px] text-red-600 font-medium">
            Integrity Window: {formatCountdown(retryAfterSeconds)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          disabled={isLocked}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
            confirming
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {confirming ? "Confirm" : "Done"}
        </button>
        {confirming ? (
          <button
            onClick={() => setConfirming(false)}
            className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => (isLocked ? undefined : onSkip(task.id))}
            disabled={isLocked}
            className="px-4 py-2.5 text-gray-300 hover:text-gray-500 text-sm transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </motion.div>
  );
}
