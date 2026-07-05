import type { DayKey, DaySummary, Entry } from "../types";
import { trackingDayFor } from "./day";
import { mirrorWrite } from "./mirror";

/**
 * Persistence lives behind this tiny repository so the storage engine can be
 * swapped (IndexedDB, a synced backend, …) without touching UI code. The
 * payload is versioned for painless future migrations.
 */
const STORAGE_KEY = "reps.store";
const STORE_VERSION = 1;

interface StoreShape {
  version: number;
  entries: Entry[];
}

export function isEntry(value: unknown): value is Entry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.calories === "number" &&
    Number.isFinite(e.calories) &&
    typeof e.description === "string" &&
    typeof e.timestamp === "number" &&
    typeof e.day === "string"
  );
}

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(isEntry);
  } catch {
    // Corrupt or inaccessible storage: start clean rather than crash.
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  try {
    const payload: StoreShape = { version: STORE_VERSION, entries };
    const json = JSON.stringify(payload);
    localStorage.setItem(STORAGE_KEY, json);
    mirrorWrite(STORAGE_KEY, json);
  } catch {
    // Storage full or unavailable — the in-memory state still works.
  }
}

/** Per-entry sanity cap; nobody logs a 100k-calorie burrito. */
export const MAX_CALORIES = 20000;

/**
 * Parse and validate raw calorie input.
 * Returns a positive integer, or null when the input is not usable.
 */
export function parseCalories(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\+/, "").replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned));
  if (!Number.isFinite(value) || value <= 0 || value > MAX_CALORIES) {
    return null;
  }
  return value;
}

export function createEntry(
  calories: number,
  description: string,
  when: Date = new Date(),
  protein: number | null = null,
): Entry {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    calories,
    description: description.trim(),
    timestamp: when.getTime(),
    day: trackingDayFor(when),
    protein,
  };
}

export interface FrequentItem {
  description: string;
  calories: number;
  /** Grams of protein carried along when logging (Menu items only). */
  protein?: number | null;
}

/**
 * The user's habitual entries, for one-tap quick-add chips. An item qualifies
 * once the same description + calorie pair has been logged at least twice;
 * the most-used (then most recent) items win.
 */
export function frequentEntries(entries: Entry[], limit = 4): FrequentItem[] {
  const stats = new Map<
    string,
    { item: FrequentItem; count: number; lastUsed: number }
  >();
  for (const e of entries) {
    const description = e.description.trim();
    if (!description) continue;
    const key = `${description.toLowerCase()}|${e.calories}`;
    const existing = stats.get(key);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Math.max(existing.lastUsed, e.timestamp);
    } else {
      stats.set(key, {
        item: { description, calories: e.calories },
        count: 1,
        lastUsed: e.timestamp,
      });
    }
  }
  return [...stats.values()]
    .filter((s) => s.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .map((s) => s.item);
}

/** Sum of entries belonging to one tracking day. */
export function totalForDay(entries: Entry[], day: DayKey): number {
  let total = 0;
  for (const e of entries) {
    if (e.day === day) total += e.calories;
  }
  return total;
}

export interface EntryGroup {
  /** Stable identity for the group across re-renders. */
  key: string;
  /** Instances, newest first. */
  items: Entry[];
  totalCalories: number;
  totalProtein: number;
}

/**
 * Collapse identical entries (same note, calories, protein) into one display
 * group so "the second Pepsi" is a +1 on an existing row, not a new row.
 * Input is expected newest-first; groups keep that order by latest activity.
 */
export function groupEntries(entries: Entry[]): EntryGroup[] {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${e.description.trim().toLowerCase()}|${e.calories}|${e.protein ?? ""}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    items,
    totalCalories: items.reduce((s, e) => s + e.calories, 0),
    totalProtein: items.reduce(
      (s, e) => s + (typeof e.protein === "number" ? e.protein : 0),
      0,
    ),
  }));
}

/** Grams of protein logged on one tracking day (entries without protein count 0). */
export function proteinForDay(entries: Entry[], day: DayKey): number {
  let total = 0;
  for (const e of entries) {
    if (e.day === day && typeof e.protein === "number") total += e.protein;
  }
  return total;
}

/** Entries for one tracking day, newest first. */
export function entriesForDay(entries: Entry[], day: DayKey): Entry[] {
  return entries
    .filter((e) => e.day === day)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Group all entries into day summaries, newest day first.
 * Days without entries simply don't appear.
 */
export function summarizeByDay(entries: Entry[]): DaySummary[] {
  const byDay = new Map<DayKey, Entry[]>();
  for (const e of entries) {
    const bucket = byDay.get(e.day);
    if (bucket) bucket.push(e);
    else byDay.set(e.day, [e]);
  }
  return [...byDay.entries()]
    .map(([day, dayEntries]) => ({
      day,
      total: dayEntries.reduce((sum, e) => sum + e.calories, 0),
      entries: dayEntries.sort((a, b) => b.timestamp - a.timestamp),
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}
