export type InterruptionInput = {
  id: string;
  title: string;
  deadline: Date | null;
  estimatedMinutes: number | null;
};

export type TaskInput = {
  id: string;
  title: string;
  durationMinutes: number;
  orderIndex: number;
};

export type ReliefBlock =
  | {
      kind: "urgent_fire";
      interruptionId: string;
      title: string;
      minutes: number;
      deadlineIso: string | null;
    }
  | {
      kind: "task";
      taskId: string;
      title: string;
      minutes: number;
    };

export function calculateRemainingMinutes(input: { now: Date; workdayEndsAt: Date }): number {
  const remaining = Math.floor((input.workdayEndsAt.getTime() - input.now.getTime()) / 60000);
  return Math.max(0, remaining);
}

export function buildReliefPlan(input: {
  now: Date;
  workdayEndsAt: Date;
  blockMinutes?: number;
  tasks: TaskInput[];
  interruptions: InterruptionInput[];
}): {
  remainingMinutes: number;
  blocks: ReliefBlock[];
  deferredTaskIds: string[];
  compressionRatio?: number;
  wasCompressed?: boolean;
} {
  const blockMinutes = input.blockMinutes ?? 25;
  const totalDaylightMinutes = calculateRemainingMinutes({
    now: input.now,
    workdayEndsAt: input.workdayEndsAt,
  });

  if (totalDaylightMinutes <= 0) {
    return {
      remainingMinutes: 0,
      blocks: [],
      deferredTaskIds: input.tasks.map((t) => t.id),
      compressionRatio: 1.0,
      wasCompressed: false,
    };
  }

  // Define our internal scheduling item
  type ScheduleItem = {
    id: string;
    title: string;
    kind: "urgent_fire" | "task";
    originalDuration: number;
    duration: number; // dynamically compressed
    deadline: Date | null;
    deadlineOffset: number | null; // minutes from now
    orderIndex: number;
  };

  const items: ScheduleItem[] = [];

  // Add interruptions
  input.interruptions.forEach((it) => {
    const duration = it.estimatedMinutes ?? blockMinutes;
    let deadlineOffset: number | null = null;
    if (it.deadline) {
      deadlineOffset = Math.floor((it.deadline.getTime() - input.now.getTime()) / 60000);
    }
    items.push({
      id: it.id,
      title: it.title,
      kind: "urgent_fire",
      originalDuration: duration,
      duration,
      deadline: it.deadline,
      deadlineOffset,
      orderIndex: -1, // interruptions take highest priority
    });
  });

  // Calculate task compression
  const totalInterruptionMinutes = items.reduce((sum, item) => sum + item.duration, 0);
  const totalTaskMinutes = input.tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
  const availableForTasks = Math.max(0, totalDaylightMinutes - totalInterruptionMinutes);

  let compressionRatio = 1.0;
  let wasCompressed = false;

  // Compressing non-essential tasks if they exceed the remaining available daylight
  if (totalTaskMinutes > availableForTasks && totalTaskMinutes > 0) {
    wasCompressed = true;
    if (availableForTasks <= 0) {
      compressionRatio = 0.0;
    } else {
      compressionRatio = availableForTasks / totalTaskMinutes;
    }
  }

  // Add tasks with compressed duration
  input.tasks.forEach((task) => {
    let duration = task.durationMinutes;
    if (wasCompressed) {
      // Compress tasks but keep a reasonable minimum duration (e.g. 15 minutes or original duration if it was smaller)
      const minDuration = Math.min(15, task.durationMinutes);
      duration = Math.max(minDuration, Math.round(task.durationMinutes * compressionRatio));
    }

    items.push({
      id: task.id,
      title: task.title,
      kind: "task",
      originalDuration: task.durationMinutes,
      duration,
      deadline: null,
      deadlineOffset: null,
      orderIndex: task.orderIndex,
    });
  });

  // Let's perform deadline-aware scheduling
  const blocks: ReliefBlock[] = [];
  const deferredTaskIds = new Set<string>();
  const scheduledTaskIds = new Set<string>();

  // Filter tasks and interruptions that can be scheduled
  const activeQueue = [...items];

  let currentOffset = 0; // minutes from now
  const finalScheduledItems: { item: ScheduleItem; scheduledDuration: number }[] = [];

  while (activeQueue.length > 0 && currentOffset < totalDaylightMinutes) {
    // Check if any deadline-constrained item is "critical"
    // Critical means: if we don't start it now, it will violate its deadline.
    // i.e., currentOffset + item.duration >= item.deadlineOffset
    const criticalItemIndex = activeQueue.findIndex((item) => {
      if (item.deadlineOffset === null) return false;
      return currentOffset + item.duration >= item.deadlineOffset;
    });

    let selectedIndex = -1;
    if (criticalItemIndex !== -1) {
      selectedIndex = criticalItemIndex;
    } else {
      // Find the next best item:
      // 1. Interruptions with deadlines (sorted by deadline offset)
      // 2. Interruptions without deadlines
      // 3. Tasks (sorted by orderIndex)
      activeQueue.sort((a, b) => {
        // Urgent fires always come first
        if (a.kind !== b.kind) {
          return a.kind === "urgent_fire" ? -1 : 1;
        }
        if (a.kind === "urgent_fire") {
          // Sort by deadline offset (earlier first)
          const ad = a.deadlineOffset ?? Number.POSITIVE_INFINITY;
          const bd = b.deadlineOffset ?? Number.POSITIVE_INFINITY;
          return ad - bd;
        }
        // Tasks sorted by orderIndex
        return a.orderIndex - b.orderIndex;
      });
      selectedIndex = 0;
    }

    const selectedItem = activeQueue[selectedIndex];
    activeQueue.splice(selectedIndex, 1);

    // Calculate how much we can schedule of this item
    const remainingTime = totalDaylightMinutes - currentOffset;
    const scheduledDuration = Math.min(selectedItem.duration, remainingTime);

    if (scheduledDuration > 0) {
      finalScheduledItems.push({ item: selectedItem, scheduledDuration });
      currentOffset += scheduledDuration;
      if (selectedItem.kind === "task") {
        scheduledTaskIds.add(selectedItem.id);
      }
    } else {
      if (selectedItem.kind === "task") {
        deferredTaskIds.add(selectedItem.id);
      }
    }
  }

  // Any items left in the activeQueue that couldn't be processed are deferred (if they are tasks)
  activeQueue.forEach((item) => {
    if (item.kind === "task") {
      deferredTaskIds.add(item.id);
    }
  });

  // Verify which of our input tasks were not scheduled
  input.tasks.forEach((task) => {
    if (!scheduledTaskIds.has(task.id)) {
      deferredTaskIds.add(task.id);
    }
  });

  // Chunk the scheduled items into blocks of blockMinutes
  finalScheduledItems.forEach(({ item, scheduledDuration }) => {
    let remainingMinutes = scheduledDuration;
    while (remainingMinutes > 0) {
      const minutes = Math.min(blockMinutes, remainingMinutes);
      if (item.kind === "urgent_fire") {
        blocks.push({
          kind: "urgent_fire",
          interruptionId: item.id,
          title: item.title,
          minutes,
          deadlineIso: item.deadline ? item.deadline.toISOString() : null,
        });
      } else {
        blocks.push({
          kind: "task",
          taskId: item.id,
          title: item.title,
          minutes,
        });
      }
      remainingMinutes -= minutes;
    }
  });

  return {
    remainingMinutes: Math.max(0, totalDaylightMinutes - currentOffset),
    blocks,
    deferredTaskIds: Array.from(deferredTaskIds),
    compressionRatio,
    wasCompressed,
  };
}

