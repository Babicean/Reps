/** A local calendar day in `YYYY-MM-DD` form (the *tracking* day, 2 AM boundary). */
export type DayKey = string;

/**
 * A single logged set — the atom of the whole app. One row per set,
 * never "3×15kg" as a blob: every future graph (top-set weight, volume,
 * PRs, rep progression) depends on per-set rows.
 */
export interface SetEntry {
  id: string;
  /** The workout session this set belongs to. */
  sessionId: string;
  /** Freeform exercise name, trimmed (matched case-insensitively). */
  exercise: string;
  /** Weight in kg, or null for bodyweight work (dips, leg raises). */
  weight: number | null;
  /** Repetitions, a positive integer. */
  reps: number;
  /** Epoch milliseconds when the set was logged. */
  timestamp: number;
}

/** One gym visit: started, sets logged, finished. */
export interface Session {
  id: string;
  /** Routine this session was started from, or null for a blank workout. */
  routineId: string | null;
  /** Routine name at the time (survives routine renames/deletes). */
  routineName: string;
  startedAt: number;
  /** Null while the session is live; set by Finish workout (or auto-close). */
  endedAt: number | null;
  /** The tracking day the session counts toward (2 AM boundary). */
  day: DayKey;
}

/** One exercise slot inside a routine, in order. */
export interface RoutineExercise {
  id: string;
  name: string;
  /** How many sets this exercise usually gets. */
  targetSets: number;
  /** Program seed: what to suggest before any history exists. */
  seedWeight: number | null;
  seedReps: number;
}

/** An ordered workout template: Push, Pull, Legs, … */
export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: number;
}

/** "Last time" for one exercise: the sets from its most recent session. */
export interface LastTime {
  /** Day of that session, for display. */
  day: DayKey;
  sets: { weight: number | null; reps: number }[];
  /** True when this is the routine's program seed, not real history. */
  fromSeed: boolean;
}
