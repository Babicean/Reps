import type { DayKey, Session, SetEntry } from "../types";
import { addDays, fromDayKey, trackingDayFor } from "./day";
import { setsForSession, volumeOf } from "./workout";

/**
 * Weeks start on Monday. A "week key" is the Monday's DayKey, so weeks
 * sort and compare as strings.
 */
export function weekKeyFor(day: DayKey): DayKey {
  const date = fromDayKey(day);
  const dow = date.getDay(); // 0 = Sunday
  const back = dow === 0 ? 6 : dow - 1;
  return addDays(day, -back);
}

export function thisWeekKey(now: Date = new Date()): DayKey {
  return weekKeyFor(trackingDayFor(now));
}

/** Finished sessions in the given week. */
export function sessionsInWeek(sessions: Session[], week: DayKey): Session[] {
  return sessions.filter(
    (s) => s.endedAt !== null && weekKeyFor(s.day) === week,
  );
}

/**
 * Consecutive weeks (ending with last week) that met the target, plus
 * this week if it's already met. "Week 4 of showing up" energy —
 * lifting has rest days, so the honest streak is weekly, not daily.
 */
export function weeklyStreak(
  sessions: Session[],
  target: number,
  now: Date = new Date(),
): number {
  if (target <= 0) return 0;
  let streak = 0;
  let week = thisWeekKey(now);
  if (sessionsInWeek(sessions, week).length >= target) streak += 1;
  week = addDays(week, -7);
  while (sessionsInWeek(sessions, week).length >= target) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export interface WeekSummary {
  week: DayKey;
  sessionCount: number;
  volume: number;
}

/** The last `count` weeks (oldest first), including empty ones. */
export function recentWeeks(
  sessions: Session[],
  sets: SetEntry[],
  count: number,
  now: Date = new Date(),
): WeekSummary[] {
  const weeks: WeekSummary[] = [];
  let week = thisWeekKey(now);
  for (let i = 0; i < count; i++) {
    const inWeek = sessionsInWeek(sessions, week);
    const volume = inWeek.reduce(
      (sum, s) => sum + volumeOf(setsForSession(sets, s.id)),
      0,
    );
    weeks.unshift({ week, sessionCount: inWeek.length, volume });
    week = addDays(week, -7);
  }
  return weeks;
}
