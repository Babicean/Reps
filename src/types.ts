/** A local calendar day in `YYYY-MM-DD` form (the *tracking* day, 2 AM boundary). */
export type DayKey = string;

/**
 * A single calorie entry.
 *
 * Deliberately flat and versioned via the store wrapper so future fields
 * (protein, weight, goal snapshots, …) can be added without migration pain.
 */
export interface Entry {
  id: string;
  /** Whole calories, always a positive integer. */
  calories: number;
  /** Optional free-text label, trimmed. Empty string when omitted. */
  description: string;
  /** Epoch milliseconds when the entry was logged. */
  timestamp: number;
  /** The tracking day this entry counts toward (2 AM local boundary). */
  day: DayKey;
  /** Grams of protein, when known (usually via a Menu item). */
  protein?: number | null;
}

/** A saved staple food in the user's personal menu. */
export interface MenuItem {
  id: string;
  name: string;
  calories: number;
  /** Grams of protein, or null when not tracked for this item. */
  protein: number | null;
  /** Pinned items surface as quick-add chips on the Today screen. */
  pinned: boolean;
  /** Optional preset category (see CategoryIcon), or null for none. */
  category: string | null;
  createdAt: number;
}

/** Aggregated view of one tracking day, used by the History screen. */
export interface DaySummary {
  day: DayKey;
  total: number;
  entries: Entry[];
}
