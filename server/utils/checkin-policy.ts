// Pure decision logic for proactive check-ins. No database or network access, so it can be unit tested directly.

export const CHECKIN_CATEGORIES = ["important", "undone_task", "follow_up", "conversation", "update"] as const;
export type CheckinCategory = (typeof CHECKIN_CATEGORIES)[number];

export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;
/** Maximum check-ins in any rolling 24 hours, urgent ones included. */
export const DAILY_CHECKIN_CAP = 3;
/** A category that was sent this recently is not repeated. */
export const CATEGORY_COOLDOWN_HOURS = 6;
/** Chance that a routine (non-urgent) window produces a check-in. Keeps timing unpredictable. */
export const BASE_SEND_CHANCE = 0.5;

export interface RecentCheckin {
  category: CheckinCategory;
  hoursAgo: number;
}

export interface CheckinSignals {
  /** Hour of day, 0-23, in the user's own timezone. */
  localHour: number;
  openTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  staleTasks: number;
  /** Sanitized Composio trigger events in the last few hours (toolkit and time only, never content). */
  recentActivity: number;
  hasMemories: boolean;
  /** Check-ins queued or sent in the last 24 hours. */
  recentCheckins: RecentCheckin[];
}

/** Random numbers in [0, 1), supplied by the caller so the decision stays deterministic in tests. */
export interface CheckinRolls {
  gate: number;
  pick: number;
}

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

function recentlySent(signals: CheckinSignals, category: CheckinCategory): boolean {
  return signals.recentCheckins.some(c => c.category === category && c.hoursAgo < CATEGORY_COOLDOWN_HOURS);
}

/**
 * Returns the category to send now, or null for silence.
 *
 * Order of rules:
 * 1. Quiet hours and the daily cap always win.
 * 2. Overdue or due-soon work is always "important" (unless one was just sent).
 * 3. Routine check-ins fire on a random gate, then a weighted pick among eligible categories.
 */
export function decideCheckin(signals: CheckinSignals, rolls: CheckinRolls): CheckinCategory | null {
  if (isQuietHour(signals.localHour)) return null;
  if (signals.recentCheckins.length >= DAILY_CHECKIN_CAP) return null;

  const urgent = signals.overdueTasks > 0 || signals.dueSoonTasks > 0;
  if (urgent && !recentlySent(signals, "important")) {
    return "important";
  }

  if (rolls.gate >= BASE_SEND_CHANCE) return null;

  const candidates: Array<{ category: CheckinCategory; weight: number }> = [];
  if (signals.staleTasks > 0) {
    candidates.push({ category: "undone_task", weight: 3 });
  }
  else if (signals.openTasks > 0) {
    candidates.push({ category: "undone_task", weight: 2 });
  }
  if (signals.recentActivity > 0) {
    candidates.push({ category: "follow_up", weight: 2 });
  }
  if (signals.recentActivity > 0 || signals.openTasks > 0) {
    candidates.push({ category: "update", weight: 2 });
  }
  candidates.push({ category: "conversation", weight: signals.hasMemories ? 2 : 1 });

  const eligible = candidates.filter(c => !recentlySent(signals, c.category));
  if (eligible.length === 0) return null;

  const total = eligible.reduce((sum, c) => sum + c.weight, 0);
  let cursor = rolls.pick * total;
  for (const candidate of eligible) {
    cursor -= candidate.weight;
    if (cursor < 0) return candidate.category;
  }
  return eligible[eligible.length - 1]!.category;
}

export function isCheckinCategory(value: string): value is CheckinCategory {
  return (CHECKIN_CATEGORIES as readonly string[]).includes(value);
}
