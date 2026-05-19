import crypto from 'crypto';

export function calculateHonestyScore(timeOnTaskMinutes: number, targetMinutes: number): number {
  if (!Number.isFinite(timeOnTaskMinutes) || timeOnTaskMinutes <= 0) return 0;
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0) return 0;

  if (timeOnTaskMinutes >= targetMinutes) return 1;
  const ratio = timeOnTaskMinutes / targetMinutes;
  return Math.max(0, Math.min(1, ratio * ratio));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calculateITS(
  previousITS: number,
  input: {
    completionRate: number;
    skipRate: number;
    avgHonesty: number;
    complexityScore: number;
    ageDays: number;
  }
): number {
  const completionRate = clamp01(input.completionRate);
  const skipRate = clamp01(input.skipRate);
  const avgHonesty = clamp01(input.avgHonesty);
  const complexityScore = clamp01(input.complexityScore);

  const skipPenalty = 0.6 * Math.pow(skipRate, 1.5);
  const dailyScore = clamp01(
    0.55 * completionRate + 0.25 * avgHonesty + 0.2 * complexityScore - skipPenalty
  );

  const ageDays = Number.isFinite(input.ageDays) ? Math.max(0, input.ageDays) : 0;
  const alpha = Math.max(0.08, Math.min(0.35, 0.35 / (1 + Math.log1p(ageDays))));

  const prev = clamp01(Number.isFinite(previousITS) ? previousITS : 0.5);
  return round2(clamp01(prev * (1 - alpha) + dailyScore * alpha));
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateTaskRootHash(
  tasks: Array<{
    id: string;
    orderIndex?: number;
    type?: string;
    title?: string;
    duration?: number;
    completed: boolean;
    skipped: boolean;
    createdAt: Date;
    completedAt: Date | null;
  }>
): string {
  const ordered = [...tasks].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const leafHashes = ordered.map((t) =>
    sha256Hex(
      [
        t.id,
        t.type ?? '',
        t.title ?? '',
        String(t.duration ?? 0),
        t.completed ? '1' : '0',
        t.skipped ? '1' : '0',
        t.createdAt.toISOString(),
        t.completedAt ? t.completedAt.toISOString() : '',
      ].join('|')
    )
  );
  return sha256Hex(leafHashes.join('|'));
}

export function generateCommitmentHash(input: {
  userId: string;
  date: string;
  currentITS: number;
  taskRootHash: string;
}): string {
  return sha256Hex(
    [input.userId, input.date, round2(input.currentITS).toFixed(2), input.taskRootHash].join('|')
  );
}

export function calculateLoadMultiplier(
  completedCount: number,
  totalCount: number,
  consecutiveFullDays: number,
  currentMultiplier: number
): { loadMultiplier: number; consecutiveFullDays: number; header: string } {
  if (totalCount === 0) {
    return { loadMultiplier: currentMultiplier, consecutiveFullDays, header: "Path is clear." };
  }

  const rate = completedCount / totalCount;

  if (rate <= 0.34) {
    return {
      loadMultiplier: Math.max(0.5, currentMultiplier * 0.5),
      consecutiveFullDays: 0,
      header: "Load adjusted.",
    };
  }

  if (rate >= 1.0) {
    const newConsecutive = consecutiveFullDays + 1;
    if (newConsecutive >= 3) {
      return {
        loadMultiplier: Math.min(1.1, currentMultiplier * 1.1),
        consecutiveFullDays: newConsecutive,
        header: "Path is clear.",
      };
    }
    return {
      loadMultiplier: currentMultiplier,
      consecutiveFullDays: newConsecutive,
      header: "Path is clear.",
    };
  }

  return {
    loadMultiplier: currentMultiplier,
    consecutiveFullDays: 0,
    header: "Pattern detected. Refining flow.",
  };
}
