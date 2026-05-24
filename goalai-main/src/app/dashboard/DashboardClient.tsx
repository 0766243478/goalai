"use client";

import { useEffect, useState, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useDashboardData } from "./DashboardDataProvider";
import { TrustScoreSkeleton, TaskListSkeleton } from "./DashboardSkeleton";

// Lazy load heavy components
const TaskControls = lazy(() => import("./TaskControls"));
const ProfilePanel = lazy(() => import("@/components/ProfilePanel"));

function TrustScoreWidget() {
  const { trustScore, data } = useDashboardData();
  if (!data?.user) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-400">Sovereign Score</p>
        <p className="text-2xl font-semibold text-gray-900">{trustScore ?? 500}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-widest text-gray-400">Gaolaif</p>
        <p className="text-xs text-gray-500">{data.user.valueSkill}</p>
      </div>
    </div>
  );
}

function ErrorBanner() {
  const { error, loadData } = useDashboardData();
  if (!error) return null;
  return (
    <div onClick={() => loadData()} className="bg-red-50 border border-red-100 rounded-xl p-4 text-center cursor-pointer hover:bg-red-100 transition-colors">
      <p className="text-sm text-red-600 font-medium">{error}</p>
      <p className="text-[10px] text-red-400 mt-1 uppercase tracking-widest">Tap to sync</p>
    </div>
  );
}

function TaskList() {
  const { tasks, loadData, data } = useDashboardData();
  const [generating, setGenerating] = useState(false);
  const [header, setHeader] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "MEDIUM", duration: 30, type: "EXECUTE" });
  const [creating, setCreating] = useState(false);
  const [taskCooldowns, setTaskCooldowns] = useState<Record<string, number>>({});

  const allDone = !!data?.allTasksCompleted;

  const generateTasks = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/tasks", { method: "POST" });
      if (!res.ok) throw new Error("Unable to generate tasks.");
      const result = await res.json();
      if (result.tasks) await loadData();
      if (result.header) setHeader(result.header);
    } catch {} finally { setGenerating(false); }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setNewTask({ title: "", priority: "MEDIUM", duration: 30, type: "EXECUTE" });
      setShowAdd(false);
      await loadData();
    } catch {
      // handled by parent
    } finally { setCreating(false); }
  };

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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-900 font-medium mb-1">{header || "Path is clear."}</p>
        <p className="text-sm text-gray-400 mb-8">3 tasks. Calibrated to your window.</p>
        <button onClick={generateTasks} disabled={generating} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
          {generating ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Calibrating</span> : "Generate"}
        </button>
      </div>
    );
  }

  if (allDone) {
    return (
      <div className="text-center py-6 animate-fade-in">
        <p className="text-gray-900 font-medium">Path cleared.</p>
        <p className="text-sm text-gray-400 mt-1">See you tomorrow.</p>
      </div>
    );
  }

  return (
    <div>
      {header && <p className="text-xs text-gray-400 mb-4">{header}</p>}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{tasks.length} active</p>
        <button onClick={() => setShowAdd((s) => !s)} className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          {showAdd ? "Close" : "Add Task"}
        </button>
      </div>
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-3 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Task Title</label>
            <input type="text" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g., Morning sprint review" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
              <input type="number" min={5} max={480} value={newTask.duration} onChange={(e) => setNewTask((p) => ({ ...p, duration: parseInt(e.target.value, 10) || 30 }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select value={newTask.type} onChange={(e) => setNewTask((p) => ({ ...p, type: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
                <option value="EXECUTE">Execute</option>
                <option value="VALUE">Value</option>
                <option value="RESET">Reset</option>
              </select>
            </div>
          </div>
          <button onClick={createTask} disabled={creating || !newTask.title.trim()} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-50">
            {creating ? "Creating..." : "Create Task"}
          </button>
        </div>
      )}
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskControls taskCooldowns={taskCooldowns} setTaskCooldowns={setTaskCooldowns} />
      </Suspense>
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const { loadData, loading } = useDashboardData();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-relief-bg">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-deep-blue rounded-full animate-spin" />
      </div>
    );
  }

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="min-h-screen bg-relief-bg">
      <header className="px-6 pt-8 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfile(true)} className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">Profile</button>
            <button onClick={() => router.push("/settings")} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-4 space-y-4">
        <Suspense fallback={<TrustScoreSkeleton />}>
          <TrustScoreWidget />
        </Suspense>
        <ErrorBanner />
        <Suspense fallback={<TaskListSkeleton />}>
          <TaskList />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <ProfilePanel open={showProfile} onClose={() => setShowProfile(false)} />
      </Suspense>
    </div>
  );
}
