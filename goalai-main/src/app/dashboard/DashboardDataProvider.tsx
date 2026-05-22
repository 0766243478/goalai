"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export interface Task {
  id: string;
  type: string;
  title: string;
  duration: number;
  hook: string;
  completed: boolean;
  skipped: boolean;
  isDay0: boolean;
  priority?: string;
}

interface DashboardUser {
  id: string;
  northStar: string;
  valueSkill: string;
  dailyWindowMinutes: number;
}

interface DashboardData {
  user: DashboardUser | null;
  tasks: Task[];
  day0: { task: Task; completed: boolean } | null;
  locked?: boolean;
  unlockTime?: string;
  showSurvey?: boolean;
  allTasksCompleted?: boolean;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  tasks: Task[];
  trustScore: number | null;
  error: string | null;
  loading: boolean;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadData: () => Promise<void>;
  trustScoreLoading: boolean;
}

const DashboardDataContext = createContext<DashboardDataContextType | null>(null);

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}

interface DashboardDataProviderProps {
  children: ReactNode;
}

export default function DashboardDataProvider({ children }: DashboardDataProviderProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trustScoreLoading, setTrustScoreLoading] = useState(true);

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
      // If all tasks were completed, pass that info to data but tasks list is already empty
      if (dashData.allTasksCompleted) {
        // Already handled by empty tasks list
      }
    } catch {
      setError("Connection lost. Tap to sync.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Trust score is fetched separately with its own loading state
  const loadTrustScore = useCallback(async () => {
    setTrustScoreLoading(true);
    try {
      const res = await fetch("/api/tasks/trust");
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json?.trust_score === "number") setTrustScore(json.trust_score);
    } catch {
      return;
    } finally {
      setTrustScoreLoading(false);
    }
  }, []);

  return (
    <DashboardDataContext.Provider
      value={{
        data,
        tasks,
        trustScore,
        error,
        loading,
        setTasks,
        setError,
        loadData,
        trustScoreLoading,
      }}
    >
      {children}
      {/* Hidden loader for trust score */}
      <TrustScoreLoader onLoad={loadTrustScore} />
    </DashboardDataContext.Provider>
  );
}

function TrustScoreLoader({ onLoad }: { onLoad: () => Promise<void> }) {
  // Trigger trust score load once on mount
  const [loaded] = useState(() => {
    onLoad();
    return true;
  });
  return null;
}
