"use client";

import { useState, useCallback } from "react";
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
    priority?: string;
  };
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onSave?: (id: string, data: { title: string; priority: string; duration: number }) => void;
  onUrgentFire?: (id: string) => void;
  onDelete?: (id: string) => void;
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

const priorityConfig: Record<string, { color: string; bg: string; border: string }> = {
  LOW: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  MEDIUM: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  HIGH: { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
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
  onSave,
  onUrgentFire,
  onDelete,
  retryAfterSeconds = 0,
}: TaskCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [urgentFiring, setUrgentFiring] = useState(false);
  const [editForm, setEditForm] = useState({
    title: task.title,
    priority: task.priority || "MEDIUM",
    duration: task.duration,
  });

  const config = typeConfig[task.type] || typeConfig.EXECUTE;
  const priorityConf = priorityConfig[editForm.priority] || priorityConfig.MEDIUM;

  const formatCountdown = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(s / 60);
    const secs = s % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLocked = retryAfterSeconds > 0;

  if (task.completed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 relative">
        <p className="text-sm text-gray-400 line-through">{task.title}</p>
        <p className="text-xs text-gray-300 mt-1">Logged.</p>
      </div>
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

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(task.id, {
        title: editForm.title,
        priority: editForm.priority,
        duration: editForm.duration,
      });
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [onSave, task.id, editForm]);

  const handleUrgent = useCallback(async () => {
    if (!onUrgentFire) return;
    setUrgentFiring(true);
    try {
      await onUrgentFire(task.id);
    } finally {
      setUrgentFiring(false);
    }
  }, [onUrgentFire, task.id]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }, [onDelete, task.id]);

  const handleCompleteClick = () => {
    if (isLocked) return;
    if (confirming) {
      triggerHaptic();
      onComplete(task.id);
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`bg-white ${config.border} border rounded-2xl p-5 shadow-sm`}
    >
      {/* Header: Type + Duration + Priority + Edit */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-semibold tracking-widest uppercase ${config.color}`}>
          {config.label}
        </span>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <span className="text-xs text-gray-400">{task.duration} min</span>
              {task.priority && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityConf.bg} ${priorityConf.color} ${priorityConf.border} border`}>
                  {task.priority}
                </span>
              )}
            </>
          )}
          {!editing ? (
            <button
              onClick={() => !isLocked && setEditing(true)}
              disabled={isLocked}
              className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
              aria-label="Edit task"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => {
                setEditing(false);
                setEditForm({ title: task.title, priority: task.priority || "MEDIUM", duration: task.duration });
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Editable or Display Fields */}
      {editing ? (
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Duration (min)</label>
              <input
                type="number"
                min={5}
                max={480}
                value={editForm.duration}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setEditForm((prev) => ({ ...prev, duration: isNaN(v) ? prev.duration : v }));
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-gray-900 font-medium leading-relaxed mb-2">{task.title}</p>
          <p className="text-xs text-gray-400 leading-relaxed mb-4">{task.hook}</p>
        </>
      )}

      {/* Integrity Window */}
      {isLocked && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-center">
          <p className="text-[11px] text-red-600 font-medium">Integrity Window: {formatCountdown(retryAfterSeconds)}</p>
        </div>
      )}

      {/* Action Buttons */}
      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleUrgent}
              disabled={urgentFiring || isLocked}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {urgentFiring ? "Firing..." : "Urgent Fire"}
            </button>
          </div>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 border border-red-100 disabled:opacity-50"
            >
              {deleting ? "Removing..." : "Remove Task"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleCompleteClick}
            disabled={isLocked}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${confirming ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {confirming ? "Confirm" : "Done"}
          </button>
          {confirming ? (
            <button onClick={() => setConfirming(false)} className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-sm">
              Cancel
            </button>
          ) : (
            <button
              onClick={() => (isLocked ? undefined : onSkip(task.id))}
              disabled={isLocked}
              className="px-4 py-2.5 text-gray-300 hover:text-gray-500 text-sm"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
