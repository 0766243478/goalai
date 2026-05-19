"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "@/components/daily/TaskCard";
import { format } from "date-fns";

interface Task {
  id: string;
  type: string;
  title: string;
  duration: number;
  hook: string;
  completed: boolean;
  skipped: boolean;
  isDay0: boolean;
}

interface DashboardData {
  user: { id: string; northStar: string; valueSkill: string; dailyWindowMinutes: number } | null;
  tasks: Task[];
  day0: { task: Task; completed: boolean } | null;
  locked?: boolean;
  unlockTime?: string;
  showSurvey?: boolean;
}

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [header, setHeader] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [taskCooldowns, setTaskCooldowns] = useState<Record<string, number>>({});

  const formatCountdown = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard");

      if (!res.ok) {
        setError("System is warming up. Retrying...");
        return;
      }

      let dashData: DashboardData;
      try {
        dashData = await res.json();
      } catch {
        setError("Received unexpected response from server.");
        return;
      }

      if (dashData.user === null && !dashData.locked) {
        router.replace("/");
        return;
      }

      if (dashData.showSurvey) {
        router.replace("/survey");
        return;
      }

      setData(dashData);
      setTasks(dashData.tasks || []);
    } catch {
      setError("Connection lost. Tap to sync.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaskCooldowns((prev) => {
        const next: Record<string, number> = {};
        for (const [taskId, seconds] of Object.entries(prev)) {
          if (seconds > 1) next[taskId] = seconds - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadTrust = async () => {
      try {
        const res = await fetch("/api/tasks/trust");
        if (!res.ok) return;
        const json = await res.json();
        if (typeof json?.trust_score === "number") setTrustScore(json.trust_score);
      } catch {
        return;
      }
    };
    loadTrust();
  }, []);

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST" });
      if (!res.ok) {
        setError("Unable to generate tasks. Tap to sync.");
        return;
      }
      const result = await res.json();
      setTasks(result.tasks || []);
      if (result.header) setHeader(result.header);
    } catch {
      setError("Unable to generate tasks. Tap to sync.");
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = async (taskId: string) => {
    if (taskCooldowns[taskId] > 0) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (res.status === 429) {
        const json = await res.json().catch(() => null);
        const retryAfter = typeof json?.retry_after === "number" ? json.retry_after : 0;
        setTaskCooldowns((prev) => ({ ...prev, [taskId]: Math.max(1, retryAfter) }));
        setError(`Integrity Window closed. Retry in ${formatCountdown(Math.max(1, retryAfter))}`);
        throw new Error("RATE_LIMIT");
      }
      if (!res.ok) throw new Error("Failed to update task");
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: false } : t)));
    }
  };

  const handleSkip = async (taskId: string) => {
    if (taskCooldowns[taskId] > 0) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, skipped: true } : t)));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipped: true }),
      });
      if (!res.ok) throw new Error("Failed to skip task");
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, skipped: false } : t)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-relief-bg">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-deep-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.user) return null;

  const today = format(new Date(), "EEEE, MMMM d");

  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed || t.skipped);

  return (
    <div className="min-h-screen bg-relief-bg">
      <header className="px-6 pt-8 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{today}</p>
          </div>
          <button
            onClick={() => router.push("/settings")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Sovereign Score</p>
            <p className="text-2xl font-semibold text-gray-900">{trustScore ?? 500}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">Gan Network</p>
            <p className="text-xs text-gray-500">{data.user.valueSkill}</p>
          </div>
        </div>

        {error && (
          <div
            onClick={() => loadData()}
            className="bg-red-50 border border-red-100 rounded-xl p-4 text-center cursor-pointer hover:bg-red-100 transition-colors"
          >
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">Tap to sync</p>
          </div>
        )}

        {allDone && (
          <div className="text-center py-6 animate-fade-in">
            <p className="text-gray-900 font-medium">Path cleared.</p>
            <p className="text-sm text-gray-400 mt-1">See you tomorrow.</p>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-900 font-medium mb-1">{header || "Path is clear."}</p>
            <p className="text-sm text-gray-400 mb-8">3 tasks. Calibrated to your window.</p>
            <button
              onClick={generateTasks}
              disabled={generating}
              className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calibrating
                </span>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        ) : (
          <div>
            {header && !allDone && <p className="text-xs text-gray-400 mb-4">{header}</p>}
            {!allDone && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">
                  {completedCount}/{tasks.length} logged
                </p>
              </div>
            )}
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  retryAfterSeconds={taskCooldowns[task.id] ?? 0}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
