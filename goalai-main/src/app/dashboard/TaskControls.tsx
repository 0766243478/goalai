"use client";

import { useCallback, useState } from "react";
import { useDashboardData } from "./DashboardDataProvider";
import TaskCard from "@/components/daily/TaskCard";

interface TaskControlsProps {
  taskCooldowns: Record<string, number>;
  setTaskCooldowns: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export default function TaskControls({ taskCooldowns, setTaskCooldowns }: TaskControlsProps) {
  const { tasks, setTasks, setError, loadData } = useDashboardData();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (taskId: string) => {
      if (taskCooldowns[taskId] > 0) return;
      // Optimistically remove task from local list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
        // Refresh dashboard state to update allTasksCompleted flag
        await loadData();
      } catch {
        // If it fails, fetch fresh data to restore correct state
        await loadData();
      }
    },
    [taskCooldowns, setTaskCooldowns, setTasks, setError, loadData]
  );

  const handleSkip = useCallback(
    async (taskId: string) => {
      if (taskCooldowns[taskId] > 0) return;
      // Optimistically remove task from local list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipped: true }),
        });
        if (!res.ok) throw new Error("Failed to skip task");
        // Refresh dashboard state to update allTasksCompleted flag
        await loadData();
      } catch {
        // If it fails, fetch fresh data to restore correct state
        await loadData();
      }
    },
    [taskCooldowns, setTasks, loadData]
  );

  const handleSave = useCallback(
    async (taskId: string, data: { title: string; priority: string; duration: number }) => {
      setUpdateError(null);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, title: data.title, priority: data.priority, duration: data.duration } : t
        )
      );
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: data.title, priority: data.priority, duration: data.duration }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Failed to save task customization");
        }
        const result = await res.json();
        if (result.task) {
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...result.task } : t)));
        }
        // Refresh dashboard state after successful save
        await loadData();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save task";
        setUpdateError(message);
        setError(message);
        await loadData();
        throw err;
      }
    },
    [setTasks, setError, loadData]
  );

  const handleUrgentFire = useCallback(
    async (taskId: string) => {
      setUpdateError(null);
      try {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) throw new Error("Task not found");
        const now = new Date();
        const workdayEndsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const res = await fetch("/api/tasks/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_duration", taskId, durationMinutes: task.duration, workdayEndsAtIso: workdayEndsAt.toISOString() }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Urgent Fire failed");
        }
        const result = await res.json();
        await loadData();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Urgent Fire failed";
        setUpdateError(message);
        setError(message);
        throw err;
      }
    },
    [tasks, setError, loadData]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      setUpdateError(null);
      // Optimistically remove task from local list
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete task");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete task";
        setUpdateError(message);
        setError(message);
        // If it fails, fetch fresh data to restore correct state
        await loadData();
      }
    },
    [setTasks, setError, loadData]
  );

  return (
    <div className="space-y-3">
      {updateError && (
        <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-center mb-3">
          <p className="text-xs text-red-600 font-medium">{updateError}</p>
        </div>
      )}
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={handleComplete}
          onSkip={handleSkip}
          onSave={handleSave}
          onUrgentFire={handleUrgentFire}
          onDelete={handleDelete}
          retryAfterSeconds={taskCooldowns[task.id] ?? 0}
        />
      ))}
    </div>
  );
}

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
