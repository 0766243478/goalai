import { prisma } from './db';
import { getDay } from 'date-fns';

export type InterruptionPattern = {
  highRiskHours: number[]; // e.g. [16, 17] for 4pm-5pm
  highRiskDays: number[];  // e.g. [2] for Tuesday
  riskScorePerHour: Record<number, number>; // hour (0-23) -> risk (0 to 1)
  riskScorePerDay: Record<number, number>;  // day (0-6) -> risk (0 to 1)
  combinedRiskScore: number;
  taskPatterns: Array<{ title: string; duration: number; priority: string; count: number }>;
  swotRisks: Array<{ type: string; description: string; severity: number }>; // severity 0-1
  recommendedBufferMinutes: number;
};

/**
 * Fetches the user's SWOT profile and converts weaknesses/threats into risk signals.
 */
async function getSwotRisks(userId: string): Promise<InterruptionPattern['swotRisks']> {
  try {
    const swot = await prisma.swotProfile.findUnique({
      where: { userId },
      select: { weaknesses: true, threats: true, weaknessesOvercome: true, threatsResolved: true },
    });

    if (!swot) return [];

    const weaknesses: string[] = JSON.parse(swot.weaknesses || '[]');
    const threats: string[] = JSON.parse(swot.threats || '[]');
    const overcomeWeaknesses: string[] = JSON.parse(swot.weaknessesOvercome || '[]');
    const resolvedThreats: string[] = JSON.parse(swot.threatsResolved || '[]');

    // Filter out overcome/resolved items — they no longer trigger buffers
    const activeWeaknesses = weaknesses.filter((w) => !overcomeWeaknesses.includes(w));
    const activeThreats = threats.filter((t) => !resolvedThreats.includes(t));

    const risks: InterruptionPattern['swotRisks'] = [];

    // Map known weakness keywords to time-based buffers
    const weaknessKeywords: Record<string, { type: string; hours: number[]; severity: number }> = {
      'afternoon fatigue': { type: 'LOW_ENERGY_BUFFER', hours: [13, 14, 15, 16], severity: 0.7 },
      'morning fatigue': { type: 'LOW_ENERGY_BUFFER', hours: [6, 7, 8, 9], severity: 0.6 },
      'evening fatigue': { type: 'LOW_ENERGY_BUFFER', hours: [18, 19, 20, 21], severity: 0.5 },
      'overthinking': { type: 'FOCUS_BUFFER', hours: [10, 11, 14, 15], severity: 0.8 },
      'distraction': { type: 'FOCUS_BUFFER', hours: [10, 11, 14, 15, 16], severity: 0.7 },
      'procrastination': { type: 'MOMENTUM_BUFFER', hours: [9, 10, 11, 14], severity: 0.75 },
      'perfectionism': { type: 'RELEASE_BUFFER', hours: [15, 16, 17], severity: 0.6 },
      'burnout': { type: 'RECOVERY_BUFFER', hours: [12, 13, 14, 15, 16], severity: 0.9 },
      'adhd': { type: 'FOCUS_BUFFER', hours: [10, 11, 14, 15], severity: 0.8 },
      'anxiety': { type: 'CALM_BUFFER', hours: [9, 10, 14, 15], severity: 0.75 },
    };

    // Process active weaknesses (exclude overcome ones)
    for (const w of activeWeaknesses) {
      const lower = w.toLowerCase();
      for (const [keyword, config] of Object.entries(weaknessKeywords)) {
        if (lower.includes(keyword)) {
          risks.push({ type: config.type, description: w, severity: config.severity });
        }
      }
    }

    // Process active threats (exclude resolved ones)
    const threatKeywords: Record<string, { type: string; severity: number }> = {
      'deadline': { type: 'DEADLINE_BUFFER', severity: 0.8 },
      'meeting': { type: 'INTERRUPTION_RISK', severity: 0.6 },
      'client': { type: 'INTERRUPTION_RISK', severity: 0.5 },
      'emergency': { type: 'CRISIS_BUFFER', severity: 0.95 },
      'family': { type: 'INTERRUPTION_RISK', severity: 0.5 },
    };

    for (const t of activeThreats) {
      const lower = t.toLowerCase();
      for (const [keyword, config] of Object.entries(threatKeywords)) {
        if (lower.includes(keyword)) {
          risks.push({ type: config.type, description: t, severity: config.severity });
        }
      }
    }

    return risks;
  } catch {
    return [];
  }
}

/**
 * Determines if the current hour is within a SWOT-defined risk window.
 */
function isInSwotRiskWindow(hour: number, risks: InterruptionPattern['swotRisks']): boolean {
  for (const risk of risks) {
    if (risk.type === 'LOW_ENERGY_BUFFER' && hour >= 13 && hour <= 16) return true;
    if (risk.type === 'MORNING_FATIGUE' && hour >= 6 && hour <= 9) return true;
    if (risk.type === 'FOCUS_BUFFER' && (hour === 10 || hour === 11 || hour === 14 || hour === 15)) return true;
  }
  return false;
}

/**
 * Analyzes the user's historical task skips, interruptions, learned TaskPatterns,
 * and SWOT profile to build a comprehensive risk map.
 */
export async function analyzeInterruptionPatterns(userId: string, now: Date = new Date()): Promise<InterruptionPattern> {
  const result: InterruptionPattern = {
    highRiskHours: [],
    highRiskDays: [],
    riskScorePerHour: {},
    riskScorePerDay: {},
    combinedRiskScore: 0,
    taskPatterns: [],
    swotRisks: [],
    recommendedBufferMinutes: 0,
  };

  try {
    // 1. Fetch historical skipped/failed tasks
    const failedTasks = await prisma.task.findMany({
      where: { userId, skipped: true },
      select: { createdAt: true },
      take: 100,
    });

    // 2. Fetch historical interruptions
    const interruptions = await prisma.interruptionLog.findMany({
      where: { userId },
      select: { createdAt: true },
      take: 100,
    });

    const hourCounts: Record<number, number> = {};
    const dayCounts: Record<number, number> = {};

    const processDate = (date: Date) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return;
      const hour = d.getHours();
      const day = getDay(d); // 0 (Sunday) to 6 (Saturday)
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    };

    failedTasks.forEach((t) => processDate(t.createdAt));
    interruptions.forEach((it) => processDate(it.createdAt));

    const totalEvents = failedTasks.length + interruptions.length;

    // Calculate normalized risk scores per hour (0-23)
    for (let h = 0; h < 24; h++) {
      const count = hourCounts[h] || 0;
      result.riskScorePerHour[h] = totalEvents > 0 ? count / totalEvents : 0;
      if (result.riskScorePerHour[h] > 0.15) {
        result.highRiskHours.push(h);
      }
    }

    // Calculate normalized risk scores per day of week (0-6)
    for (let d = 0; d < 7; d++) {
      const count = dayCounts[d] || 0;
      result.riskScorePerDay[d] = totalEvents > 0 ? count / totalEvents : 0;
      if (result.riskScorePerDay[d] > 0.2) {
        result.highRiskDays.push(d);
      }
    }

    // Calculate current risk profile based on current hour and day
    const currentHour = now.getHours();
    const currentDay = getDay(now);

    const hourRisk = result.riskScorePerHour[currentHour] || 0;
    const dayRisk = result.riskScorePerDay[currentDay] || 0;

    // Combined risk is weighted, prioritizing time-of-day dips
    let combinedRisk = Math.min(1.0, hourRisk * 1.5 + dayRisk * 0.5);

    // 3. Load learned TaskPatterns (AI memory)
    const taskPatterns = await prisma.taskPattern.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
      take: 20,
    });
    result.taskPatterns = taskPatterns.map((p) => ({
      title: p.title,
      duration: p.duration,
      priority: p.priority,
      count: p.count,
    }));

    // 4. Load SWOT profile risks
    const swotRisks = await getSwotRisks(userId);
    result.swotRisks = swotRisks;

    // 5. Boost combined risk if SWOT flags current hour
    if (isInSwotRiskWindow(currentHour, swotRisks)) {
      combinedRisk = Math.min(1.0, combinedRisk + 0.2);
    }

    result.combinedRiskScore = combinedRisk;

    // 6. Calculate recommended buffer from SWOT severity
    const maxSwotSeverity = swotRisks.reduce((max, r) => Math.max(max, r.severity), 0);
    result.recommendedBufferMinutes = maxSwotSeverity > 0.7 ? 30 : maxSwotSeverity > 0.4 ? 15 : 0;

  } catch (error) {
    console.error('Failed to analyze interruption patterns:', error);
  }

  return result;
}

/**
 * Modifies buildReliefPlan inputs by dynamically injecting buffers or compressing
 * tasks if scheduled during a high-risk window for the user.
 * Now reads TaskPatterns and SWOT profile to personalize modifications.
 */
export function applyAdaptiveVisionModifications(
  tasks: { id: string; title: string; durationMinutes: number; orderIndex: number }[],
  pattern: InterruptionPattern
): {
  adjustedTasks: { id: string; title: string; durationMinutes: number; orderIndex: number }[];
  injectedBufferMinutes: number;
} {
  const risk = pattern.combinedRiskScore;
  const { swotRisks, recommendedBufferMinutes } = pattern;

  // SWOT-driven early-exit: if SWOT flags high severity, inject buffer immediately
  const hasSwotRisk = swotRisks.length > 0 && swotRisks.some((r) => r.severity > 0.6);

  if (risk > 0.25 || hasSwotRisk) {
    // Under high risk of failure/interruption:
    // 1. Dynamic Compression: scale down non-essential task durations to keep them light
    const compressionFactor = Math.max(0.5, 1.0 - risk); // Max 50% compression

    const adjustedTasks = tasks.map((task) => {
      let durationMinutes = Math.max(15, Math.round(task.durationMinutes * compressionFactor));
      const hasCompressed = durationMinutes < task.durationMinutes;

      // SWOT override: if a task matches a frequently customized pattern, use that duration
      const matchingPattern = pattern.taskPatterns.find(
        (p) => task.title.toLowerCase().includes(p.title.toLowerCase())
      );
      if (matchingPattern) {
        durationMinutes = matchingPattern.duration;
      }

      return {
        ...task,
        durationMinutes,
        title: hasCompressed ? `[Light] ${task.title}` : task.title,
      };
    });

    // 2. Preemptively allocate a buffer space to handle the expected interruption
    const injectedBufferMinutes = risk > 0.5 ? 30 : hasSwotRisk ? recommendedBufferMinutes : 15;

    return {
      adjustedTasks,
      injectedBufferMinutes,
    };
  }

  return {
    adjustedTasks: tasks,
    injectedBufferMinutes: 0,
  };
}
