import type { DayKey, Entry } from "../types";
import { addDays } from "./day";

export interface WeeklyStats {
  /** Days with at least one entry in the last 7 tracking days. */
  daysLogged: number;
  /** Average calories per logged day, or null when nothing was logged. */
  avg: number | null;
  /** Same average for the 7 days before that, or null. */
  prevAvg: number | null;
  /** Signed percent change vs the previous week, or null when unknowable. */
  deltaPct: number | null;
  /** Average grams of protein per logged day, or null when none tracked. */
  proteinAvg: number | null;
}

/** Recap of the rolling week ending `today`, compared with the week before. */
export function weeklyStats(entries: Entry[], today: DayKey): WeeklyStats {
  const window = (start: number, end: number) => {
    const days = new Set<DayKey>();
    for (let i = start; i <= end; i++) days.add(addDays(today, -i));
    return days;
  };
  const thisWeek = window(0, 6);
  const lastWeek = window(7, 13);

  let calories = 0;
  let protein = 0;
  let prevCalories = 0;
  const loggedDays = new Set<DayKey>();
  const prevLoggedDays = new Set<DayKey>();

  for (const e of entries) {
    if (thisWeek.has(e.day)) {
      calories += e.calories;
      if (typeof e.protein === "number") protein += e.protein;
      loggedDays.add(e.day);
    } else if (lastWeek.has(e.day)) {
      prevCalories += e.calories;
      prevLoggedDays.add(e.day);
    }
  }

  const daysLogged = loggedDays.size;
  const avg = daysLogged > 0 ? Math.round(calories / daysLogged) : null;
  const prevAvg =
    prevLoggedDays.size > 0
      ? Math.round(prevCalories / prevLoggedDays.size)
      : null;
  const deltaPct =
    avg !== null && prevAvg !== null && prevAvg > 0
      ? Math.round(((avg - prevAvg) / prevAvg) * 100)
      : null;
  const proteinAvg =
    daysLogged > 0 && protein > 0 ? Math.round(protein / daysLogged) : null;

  return { daysLogged, avg, prevAvg, deltaPct, proteinAvg };
}
