"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SwotWizardProps {
  initial: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    weaknessesOvercome: string[];
    threatsResolved: string[];
  };
}

export default function SwotWizard({ initial }: SwotWizardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"strengths" | "weaknesses" | "opportunities" | "threats">("strengths");
  const [data, setData] = useState(initial);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: { key: typeof activeTab; label: string; color: string; desc: string }[] = [
    { key: "strengths", label: "Strengths", color: "bg-blue-50 text-blue-700 border-blue-200", desc: "What do you excel at? (e.g., Deep work, Communication)" },
    { key: "weaknesses", label: "Weaknesses", color: "bg-red-50 text-red-700 border-red-200", desc: "What drains you? (e.g., Afternoon fatigue, Overthinking)" },
    { key: "opportunities", label: "Opportunities", color: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "What can you leverage? (e.g., New skill, Quiet mornings)" },
    { key: "threats", label: "Threats", color: "bg-amber-50 text-amber-700 border-amber-200", desc: "What derails you? (e.g., Tight deadlines, Family interruptions)" },
  ];

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (data[activeTab].includes(trimmed)) return;
    setData((prev) => ({ ...prev, [activeTab]: [...prev[activeTab], trimmed] }));
    setNewItem("");
  };

  const removeItem = (index: number) => {
    setData((prev) => {
      const item = prev[activeTab][index];
      if (activeTab === "weaknesses") {
        return {
          ...prev,
          [activeTab]: prev[activeTab].filter((_, i) => i !== index),
          weaknessesOvercome: prev.weaknessesOvercome.filter((w) => w !== item),
        };
      }
      if (activeTab === "threats") {
        return {
          ...prev,
          [activeTab]: prev[activeTab].filter((_, i) => i !== index),
          threatsResolved: prev.threatsResolved.filter((t) => t !== item),
        };
      }
      return { ...prev, [activeTab]: prev[activeTab].filter((_, i) => i !== index) };
    });
  };

  const toggleOvercome = (item: string) => {
    setData((prev) => {
      const isOvercome = prev.weaknessesOvercome.includes(item);
      return {
        ...prev,
        weaknessesOvercome: isOvercome
          ? prev.weaknessesOvercome.filter((w) => w !== item)
          : [...prev.weaknessesOvercome, item],
      };
    });
  };

  const toggleResolved = (item: string) => {
    setData((prev) => {
      const isResolved = prev.threatsResolved.includes(item);
      return {
        ...prev,
        threatsResolved: isResolved
          ? prev.threatsResolved.filter((t) => t !== item)
          : [...prev.threatsResolved, item],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/swot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save SWOT profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const currentTab = tabs.find((t) => t.key === activeTab)!;
  const isWeaknessOrThreat = activeTab === "weaknesses" || activeTab === "threats";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeTab === tab.key ? `${tab.color} shadow-sm` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`bg-white border ${currentTab.color.split(" ").pop()} rounded-2xl p-5 shadow-sm space-y-4`}>
        <p className="text-sm text-gray-500">{currentTab.desc}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="Add an item..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button onClick={addItem} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all">
            Add
          </button>
        </div>

        <div className="space-y-2">
          {data[activeTab].length === 0 && (
            <p className="text-xs text-gray-400 italic">No items yet. Add one above.</p>
          )}
          {data[activeTab].map((item, i) => {
            const isOvercome = activeTab === "weaknesses" && data.weaknessesOvercome.includes(item);
            const isResolved = activeTab === "threats" && data.threatsResolved.includes(item);
            const isDone = isOvercome || isResolved;
            return (
              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                isDone ? "bg-gray-50 border-green-200" : "bg-gray-50 border-gray-100"
              }`}>
                <div className="flex items-center gap-2">
                  {isWeaknessOrThreat && (
                    <button
                      onClick={() => activeTab === "weaknesses" ? toggleOvercome(item) : toggleResolved(item)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isDone ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {isDone && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}
                  <span className={`text-sm ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>{item}</span>
                  {isDone && (
                    <span className="text-[10px] font-medium text-green-600">
                      {activeTab === "weaknesses" ? "Overcome" : "Resolved"}
                    </span>
                  )}
                </div>
                <button onClick={() => removeItem(i)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Save Strategic Profile"}
        </button>
      </div>
    </div>
  );
}
