import type { DayKey } from "../types";
import { fromDayKey, trackingDayFor, addDays } from "./day";

const numberFormat = new Intl.NumberFormat();

/** Thousands-grouped whole number, e.g. 8,540. */
export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

/** A weight in kg without trailing noise: 17.5, 100, 11.25. */
export function formatKg(value: number): string {
  return numberFormat.format(Math.round(value * 100) / 100);
}

/** One set for display: "85 kg × 7" or "× 12" for bodyweight. */
export function formatSet(weight: number | null, reps: number): string {
  return weight === null ? `× ${reps}` : `${formatKg(weight)} kg × ${reps}`;
}

/** Session duration, e.g. "47 min" or "1 h 12 min". */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Today", "Yesterday", or e.g. "Tuesday, July 1" for this year's dates. */
export function formatDayLabel(day: DayKey, now: Date = new Date()): string {
  const today = trackingDayFor(now);
  if (day === today) return "Today";
  if (day === addDays(today, -1)) return "Yesterday";
  const date = fromDayKey(day);
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Compact day for session rows, e.g. "Mon 5 Jul". */
export function formatShortDay(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** e.g. "Friday, July 4" — the hero date on the Today screen. */
export function formatHeroDate(day: DayKey): string {
  return fromDayKey(day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Week axis label from a Monday week-key, e.g. "30 Jun". */
export function formatWeekLabel(week: DayKey): string {
  return fromDayKey(week).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
