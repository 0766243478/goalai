"use client";

import { useState, useEffect, useCallback } from "react";

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

// Inline close icon to avoid external dependency
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const [tab, setTab] = useState<"goals" | "swot">("goals");
  const [northStar, setNorthStar] = useState("");
  const [valueSkill, setValueSkill] = useState("");
  const [dailyWindow, setDailyWindow] = useState(30);
  const [friction, setFriction] = useState("DISTRACTION");
  const [swot, setSwot] = useState<{
    strengths: string[]; weaknesses: string[];
    opportunities: string[]; threats: string[];
    weaknessesOvercome: string[]; threatsResolved: string[];
  }>({ strengths: [], weaknesses: [], opportunities: [], threats: [], weaknessesOvercome: [], threatsResolved: [] });
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [swotTab, setSwotTab] = useState<"strengths" | "weaknesses" | "opportunities" | "threats">("strengths");
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [userRes, swotRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/swot"),
      ]);
      if (userRes.ok) {
        const { user } = await userRes.json();
        if (user) {
          setNorthStar(user.northStar || "");
          setValueSkill(user.valueSkill || "");
          setDailyWindow(user.dailyWindowMinutes || 30);
          setFriction(user.frictionTrigger || "DISTRACTION");
        }
      }
      if (swotRes.ok) {
        const data = await swotRes.json();
        setSwot({
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          opportunities: data.opportunities || [],
          threats: data.threats || [],
          weaknessesOvercome: data.weaknessesOvercome || [],
          threatsResolved: data.threatsResolved || [],
        });
      }
    } catch {} finally { setLoading(false); }
  }, [open]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ northStar, valueSkill, frictionTrigger: friction, dailyWindowMinutes: dailyWindow }),
      });
    } finally { setSaving(false); }
  };

  const handleSaveSwot = async () => {
    setSaving(true);
    try {
      await fetch("/api/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swot),
      });
    } finally { setSaving(false); }
  };

  const addSwotItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setSwot((prev) => ({
      ...prev,
      [swotTab]: [...prev[swotTab], trimmed],
    }));
    setNewItem("");
  };

  const removeSwotItem = (index: number) => {
    setSwot((prev) => ({
      ...prev,
      [swotTab]: prev[swotTab].filter((_, i) => i !== index),
    }));
  };

  const syncSwot = useCallback(async (updatedSwot: typeof swot) => {
    try {
      await fetch("/api/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSwot),
      });
    } catch {
      // Silent fail
    }
  }, []);

  const toggleOvercome = (item: string) => {
    setSwot((prev) => {
      const isOvercome = prev.weaknessesOvercome.includes(item);
      const updated = {
        ...prev,
        weaknessesOvercome: isOvercome
          ? prev.weaknessesOvercome.filter((w) => w !== item)
          : [...prev.weaknessesOvercome, item],
      };
      syncSwot(updated);
      return updated;
    });
  };

  const toggleResolved = (item: string) => {
    setSwot((prev) => {
      const isResolved = prev.threatsResolved.includes(item);
      const updated = {
        ...prev,
        threatsResolved: isResolved
          ? prev.threatsResolved.filter((t) => t !== item)
          : [...prev.threatsResolved, item],
      };
      syncSwot(updated);
      return updated;
    });
  };

  const activeItems = swot[swotTab];
  const overcomeItems = swot.weaknessesOvercome;
  const resolvedItems = swot.threatsResolved;

  const swotTabs: { key: typeof swotTab; label: string; color: string; desc: string }[] = [
    { key: "strengths", label: "Strengths", color: "bg-blue-50 text-blue-700", desc: "What you excel at" },
    { key: "weaknesses", label: "Weaknesses", color: "bg-red-50 text-red-700", desc: "What drains you" },
    { key: "opportunities", label: "Opportunities", color: "bg-emerald-50 text-emerald-700", desc: "What you can leverage" },
    { key: "threats", label: "Threats", color: "bg-amber-50 text-amber-700", desc: "What derails you" },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-sm font-semibold text-gray-900">Strategic Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          <button onClick={() => setTab("goals")} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === "goals" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>North Star</button>
          <button onClick={() => setTab("swot")} className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === "swot" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>SWOT</button>
        </div>

        <div className="p-5 space-y-5">
          {/* GOALS TAB */}
          {tab === "goals" && (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">North Star (Core Goal)</label>
                <input type="text" value={northStar} onChange={(e) => setNorthStar(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g., Master full-stack development" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Value Skill</label>
                <input type="text" value={valueSkill} onChange={(e) => setValueSkill(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g., software engineering" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Daily Window (min)</label>
                  <input type="number" min={5} max={240} value={dailyWindow} onChange={(e) => setDailyWindow(parseInt(e.target.value, 10) || 30)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Friction Trigger</label>
                  <select value={friction} onChange={(e) => setFriction(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
                    <option value="OVERTHINKING">Overthinking</option>
                    <option value="ENERGY_CRASH">Energy Crash</option>
                    <option value="DISTRACTION">Distraction</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSaveGoals} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save Goals"}
              </button>
            </>
          )}

          {/* SWOT TAB */}
          {tab === "swot" && (
            <>
              <div className="flex flex-wrap gap-2">
                {swotTabs.map((t) => (
                  <button key={t.key} onClick={() => setSwotTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${swotTab === t.key ? `${t.color} border-current` : "bg-white text-gray-500 border-gray-200"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addSwotItem(); }}
                  placeholder="Add item..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
                <button onClick={addSwotItem} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800">Add</button>
              </div>

              <div className="space-y-2">
                {activeItems.length === 0 && <p className="text-xs text-gray-400 italic">No items yet.</p>}
                {activeItems.map((item, i) => {
                  const isOvercome = swotTab === "weaknesses" && overcomeItems.includes(item);
                  const isResolved = swotTab === "threats" && resolvedItems.includes(item);
                  const isDone = isOvercome || isResolved;
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isDone ? "bg-gray-50 border-green-200" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-center gap-2">
                        {(swotTab === "weaknesses" || swotTab === "threats") && (
                          <button onClick={() => swotTab === "weaknesses" ? toggleOvercome(item) : toggleResolved(item)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-gray-500"}`}>
                            {isDone && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        )}
                        <span className={`text-sm ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>{item}</span>
                        {isDone && <span className="text-[10px] font-medium text-green-600">{swotTab === "weaknesses" ? "Overcome" : "Resolved"}</span>}
                      </div>
                      <button onClick={() => removeSwotItem(i)} className="text-xs text-gray-400 hover:text-red-500">Remove</button>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleSaveSwot} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save SWOT Profile"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
