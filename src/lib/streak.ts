import type { DayKey, Entry } from "../types";
import { addDays } from "./day";

export interface Streak {
  /** Consecutive tracking days with at least one entry. */
  length: number;
  /** Whether today is part of the chain yet. */
  loggedToday: boolean;
}

/**
 * The logging streak: consecutive tracking days ending today (or yesterday —
 * an unlogged today doesn't break the chain until the day actually rolls
 * over, it just isn't counted yet). Rewards showing up, not eating less.
 */
export function computeStreak(entries: Entry[], today: DayKey): Streak {
  const days = new Set<DayKey>();
  for (const e of entries) days.add(e.day);

  const loggedToday = days.has(today);
  let cursor = loggedToday ? today : addDays(today, -1);
  let length = 0;
  while (days.has(cursor)) {
    length += 1;
    cursor = addDays(cursor, -1);
  }
  return { length, loggedToday };
}
