"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  northStar: string | null;
  valueSkill: string | null;
  frictionTrigger: string;
  dailyWindowMinutes: number;
  createdAt: string;
}

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  weaknessesOvercome: string[];
  threatsResolved: string[];
}

const frictionOptions = [
  { value: "OVERTHINKING", label: "Overthinking" },
  { value: "ENERGY_CRASH", label: "Energy Crash" },
  { value: "DISTRACTION", label: "Distraction" },
];

const swotTabs = [
  { key: "strengths" as const, label: "Strengths", color: "bg-blue-50 text-blue-700" },
  { key: "weaknesses" as const, label: "Weaknesses", color: "bg-red-50 text-red-700" },
  { key: "opportunities" as const, label: "Opportunities", color: "bg-emerald-50 text-emerald-700" },
  { key: "threats" as const, label: "Threats", color: "bg-amber-50 text-amber-700" },
];

async function fetchSwot(): Promise<SwotData> {
  const res = await fetch("/api/swot");
  if (!res.ok) return { strengths: [], weaknesses: [], opportunities: [], threats: [], weaknessesOvercome: [], threatsResolved: [] };
  return res.json();
}

async function saveSwot(data: SwotData): Promise<boolean> {
  const res = await fetch("/api/swot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  return res.ok;
}

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Editable fields
  const [northStar, setNorthStar] = useState("");
  const [valueSkill, setValueSkill] = useState("");
  const [frictionTrigger, setFrictionTrigger] = useState("OVERTHINKING");
  const [dailyWindowMinutes, setDailyWindowMinutes] = useState(30);

  // SWOT state
  const [swotData, setSwotData] = useState<SwotData>({ strengths: [], weaknesses: [], opportunities: [], threats: [], weaknessesOvercome: [], threatsResolved: [] });
  const [swotTab, setSwotTab] = useState<"strengths" | "weaknesses" | "opportunities" | "threats">("strengths");
  const [newSwotItem, setNewSwotItem] = useState("");
  const [swotSaving, setSwotSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user");
        const data = await res.json();
        if (!data.user) { router.replace("/"); return; }
        const u = data.user as UserProfile;
        setUser(u);
        setNorthStar(u.northStar || "");
        setValueSkill(u.valueSkill || "");
        setFrictionTrigger(u.frictionTrigger);
        setDailyWindowMinutes(u.dailyWindowMinutes);
      } catch { router.replace("/"); }
      finally { setLoading(false); }
    })();
  }, [router]);

  useEffect(() => {
    (async () => {
      const swot = await fetchSwot();
      setSwotData(swot);
    })();
  }, []);

  const handleSaveGoals = async () => {
    setSaving(true);
    setError(null);
    setSuccessBanner(false);
    try {
      const res = await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ northStar, valueSkill, frictionTrigger, dailyWindowMinutes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch {
      setError("Save failed. Try again.");
    } finally { setSaving(false); }
  };

  const addSwotItem = () => {
    const trimmed = newSwotItem.trim();
    if (!trimmed) return;
    if (swotData[swotTab].includes(trimmed)) return;
    setSwotData((prev) => ({ ...prev, [swotTab]: [...prev[swotTab], trimmed] }));
    setNewSwotItem("");
  };

  const removeSwotItem = (index: number) => {
    setSwotData((prev) => {
      const item = prev[swotTab][index];
      if (swotTab === "weaknesses") return { ...prev, [swotTab]: prev[swotTab].filter((_, i) => i !== index), weaknessesOvercome: prev.weaknessesOvercome.filter((w) => w !== item) };
      if (swotTab === "threats") return { ...prev, [swotTab]: prev[swotTab].filter((_, i) => i !== index), threatsResolved: prev.threatsResolved.filter((t) => t !== item) };
      return { ...prev, [swotTab]: prev[swotTab].filter((_, i) => i !== index) };
    });
  };

  const toggleOvercome = (item: string) => {
    setSwotData((prev) => {
      const is = prev.weaknessesOvercome.includes(item);
      return { ...prev, weaknessesOvercome: is ? prev.weaknessesOvercome.filter((w) => w !== item) : [...prev.weaknessesOvercome, item] };
    });
  };

  const toggleResolved = (item: string) => {
    setSwotData((prev) => {
      const is = prev.threatsResolved.includes(item);
      return { ...prev, threatsResolved: is ? prev.threatsResolved.filter((t) => t !== item) : [...prev.threatsResolved, item] };
    });
  };

  const handleSaveSwot = async () => {
    setSwotSaving(true);
    setError(null);
    setSuccessBanner(false);
    try {
      const ok = await saveSwot(swotData);
      if (!ok) throw new Error("Failed to save SWOT");
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
    } catch {
      setError("SWOT save failed. Try again.");
    } finally { setSwotSaving(false); }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await fetch("/api/user/signout", { method: "POST" }); router.replace("/"); }
    catch { setSigningOut(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try { await fetch("/api/user/delete", { method: "DELETE" }); router.replace("/"); }
    catch { setDeleting(false); setShowDeleteConfirm(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-relief-bg"><div className="w-8 h-8 border-2 border-gray-200 border-t-deep-blue rounded-full animate-spin" /></div>;
  }

  if (!user) return null;

  const memberSince = format(new Date(user.createdAt), "MMMM d, yyyy");
  const isWeaknessOrThreat = swotTab === "weaknesses" || swotTab === "threats";
  const activeItems = swotData[swotTab];

  return (
    <div className="min-h-screen bg-relief-bg">
      <header className="px-6 py-4 border-b border-gray-100">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-medium text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6 space-y-6">
        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center animate-fade-in">
            <p className="text-sm font-medium text-emerald-700">Settings Saved Successfully</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center animate-fade-in">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {/* North Star Configuration */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">North Star</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Core Goal</label>
              <input type="text" value={northStar} onChange={(e) => setNorthStar(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g., Master full-stack development" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Value Skill</label>
              <input type="text" value={valueSkill} onChange={(e) => setValueSkill(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" placeholder="e.g., software engineering" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Daily Window (min)</label>
                <input type="number" min={5} max={480} value={dailyWindowMinutes} onChange={(e) => setDailyWindowMinutes(parseInt(e.target.value, 10) || 30)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Friction Trigger</label>
                <select value={frictionTrigger} onChange={(e) => setFrictionTrigger(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
                  {frictionOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleSaveGoals} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-all">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {/* SWOT Matrix */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">SWOT Matrix</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              {swotTabs.map((t) => (
                <button key={t.key} onClick={() => setSwotTab(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${swotTab === t.key ? `${t.color} border-current` : "bg-white text-gray-500 border-gray-200"}`}
                >{t.label}</button>
              ))}
            </div>

            <div className="flex gap-2">
              <input type="text" value={newSwotItem} onChange={(e) => setNewSwotItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addSwotItem(); }}
                placeholder="Add item..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300" />
              <button onClick={addSwotItem} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800">Add</button>
            </div>

            <div className="space-y-2">
              {activeItems.length === 0 && <p className="text-xs text-gray-400 italic">No items yet.</p>}
              {activeItems.map((item, i) => {
                const isOvercome = swotTab === "weaknesses" && swotData.weaknessesOvercome.includes(item);
                const isResolved = swotTab === "threats" && swotData.threatsResolved.includes(item);
                const isDone = isOvercome || isResolved;
                return (
                  <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isDone ? "bg-gray-50 border-green-200" : "bg-gray-50 border-gray-100"}`}>
                    <div className="flex items-center gap-2">
                      {isWeaknessOrThreat && (
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

            <button onClick={handleSaveSwot} disabled={swotSaving} className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 transition-all">
              {swotSaving ? "Saving..." : "Save SWOT Profile"}
            </button>
          </div>
        </section>

        {/* Member Since (read-only) */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Account</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Member Since</span>
              <span className="text-sm text-gray-900">{memberSince}</span>
            </div>
          </div>
        </section>

        {/* Sign Out / Delete */}
        <section className="space-y-2">
          <button onClick={handleSignOut} disabled={signingOut} className="w-full text-left px-4 py-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm disabled:opacity-50">
            {signingOut ? "Signing out..." : "Sign Out"}
          </button>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm">
              Delete Account
            </button>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm text-red-700 mb-3">This will permanently delete all your data. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white text-gray-600 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
