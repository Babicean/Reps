import type {
  LastTime,
  Routine,
  RoutineExercise,
  Session,
  SetEntry,
} from "../types";
import { trackingDayFor } from "./day";
import { mirrorWrite } from "./mirror";

/**
 * The workout store: sessions, sets, and routines, each under its own
 * versioned key so they can evolve independently. localStorage is the
 * synchronous source of truth; every write is mirrored natively.
 */
const SESSIONS_KEY = "reps.sessions";
const SETS_KEY = "reps.sets";
const ROUTINES_KEY = "reps.routines";
const STORE_VERSION = 1;

/** A live session left open this long is assumed finished (phone died,
 *  forgot to tap Finish). Applied on load. */
const AUTO_CLOSE_MS = 4 * 60 * 60 * 1000;

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ---- persistence ------------------------------------------------------- */

function loadList<T>(key: string, field: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const list = parsed?.[field];
    return Array.isArray(list) ? (list as T[]) : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, field: string, list: T[]): void {
  try {
    const json = JSON.stringify({ version: STORE_VERSION, [field]: list });
    localStorage.setItem(key, json);
    mirrorWrite(key, json);
  } catch {
    // Storage unavailable — the session just won't persist.
  }
}

export function loadSessions(): Session[] {
  const sessions = loadList<Session>(SESSIONS_KEY, "sessions").filter(
    (s) =>
      s &&
      typeof s.id === "string" &&
      typeof s.startedAt === "number" &&
      typeof s.day === "string",
  );
  // Auto-close anything left running unreasonably long.
  const now = Date.now();
  let changed = false;
  for (const s of sessions) {
    if (s.endedAt === null && now - s.startedAt > AUTO_CLOSE_MS) {
      s.endedAt = s.startedAt + AUTO_CLOSE_MS;
      changed = true;
    }
  }
  if (changed) saveSessions(sessions);
  return sessions;
}

export function saveSessions(sessions: Session[]): void {
  saveList(SESSIONS_KEY, "sessions", sessions);
}

export function loadSets(): SetEntry[] {
  return loadList<SetEntry>(SETS_KEY, "sets").filter(
    (s) =>
      s &&
      typeof s.id === "string" &&
      typeof s.exercise === "string" &&
      typeof s.reps === "number",
  );
}

export function saveSets(sets: SetEntry[]): void {
  saveList(SETS_KEY, "sets", sets);
}

export function loadRoutines(): Routine[] {
  const routines = loadList<Routine>(ROUTINES_KEY, "routines").filter(
    (r) => r && typeof r.id === "string" && Array.isArray(r.exercises),
  );
  return routines.length > 0 ? routines : seedRoutines();
}

export function saveRoutines(routines: Routine[]): void {
  saveList(ROUTINES_KEY, "routines", routines);
}

/* ---- creation ---------------------------------------------------------- */

export function createSession(
  routine: Routine | null,
  when: Date = new Date(),
): Session {
  return {
    id: makeId(),
    routineId: routine?.id ?? null,
    routineName: routine?.name ?? "Workout",
    startedAt: when.getTime(),
    endedAt: null,
    day: trackingDayFor(when),
  };
}

export function createSet(
  sessionId: string,
  exercise: string,
  weight: number | null,
  reps: number,
  when: Date = new Date(),
): SetEntry {
  return {
    id: makeId(),
    sessionId,
    exercise: exercise.trim(),
    weight,
    reps,
    timestamp: when.getTime(),
  };
}

export function createRoutineExercise(
  name: string,
  targetSets: number,
  seedWeight: number | null,
  seedReps: number,
): RoutineExercise {
  return { id: makeId(), name: name.trim(), targetSets, seedWeight, seedReps };
}

/* ---- validation -------------------------------------------------------- */

/** Parse a weight field: kg with 0.25 precision, blank = bodyweight. */
export function parseWeight(input: string): number | null | undefined {
  const trimmed = input.trim().replace(",", ".");
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 1000) return undefined;
  return Math.round(value * 4) / 4;
}

/** Parse a reps field: positive integer up to 200. */
export function parseReps(input: string): number | undefined {
  const value = Number(input.trim());
  if (!Number.isInteger(value) || value < 1 || value > 200) return undefined;
  return value;
}

/* ---- queries ----------------------------------------------------------- */

const sameExercise = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

export function setsForSession(sets: SetEntry[], sessionId: string): SetEntry[] {
  return sets
    .filter((s) => s.sessionId === sessionId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Total kg moved: Σ weight × reps. Bodyweight sets add no volume. */
export function volumeOf(sets: SetEntry[]): number {
  return sets.reduce((sum, s) => sum + (s.weight ?? 0) * s.reps, 0);
}

/**
 * The sets this exercise got in its most recent *finished* session
 * (excluding `excludeSessionId`, normally the live one). Falls back to
 * the routine's program seed so day one still shows numbers to beat.
 */
export function lastTimeFor(
  exercise: string,
  sets: SetEntry[],
  sessions: Session[],
  routines: Routine[],
  excludeSessionId?: string,
): LastTime | null {
  const own = sets.filter(
    (s) => sameExercise(s.exercise, exercise) && s.sessionId !== excludeSessionId,
  );
  if (own.length > 0) {
    const byId = new Map(sessions.map((s) => [s.id, s]));
    let latest: Session | null = null;
    for (const s of own) {
      const session = byId.get(s.sessionId);
      if (!session) continue;
      if (!latest || session.startedAt > latest.startedAt) latest = session;
    }
    if (latest) {
      const chosen = latest;
      const rows = own
        .filter((s) => s.sessionId === chosen.id)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((s) => ({ weight: s.weight, reps: s.reps }));
      return { day: chosen.day, sets: rows, fromSeed: false };
    }
  }
  // Program seed fallback.
  for (const routine of routines) {
    const slot = routine.exercises.find((e) => sameExercise(e.name, exercise));
    if (slot) {
      return {
        day: "",
        sets: Array.from({ length: slot.targetSets }, () => ({
          weight: slot.seedWeight,
          reps: slot.seedReps,
        })),
        fromSeed: true,
      };
    }
  }
  return null;
}

/**
 * Is this weight a new personal record for the exercise? True when it
 * beats every previously logged weight (seeds don't count; you have to
 * have lifted it in the app once before a PR can exist).
 */
export function isPersonalRecord(
  exercise: string,
  weight: number | null,
  sets: SetEntry[],
  excludeSetId?: string,
): boolean {
  if (weight === null) return false;
  const prior = sets.filter(
    (s) =>
      sameExercise(s.exercise, exercise) &&
      s.id !== excludeSetId &&
      s.weight !== null,
  );
  if (prior.length === 0) return false;
  return prior.every((s) => (s.weight ?? 0) < weight);
}

/** Best (heaviest) weight ever logged for an exercise, or null. */
export function bestWeightFor(
  exercise: string,
  sets: SetEntry[],
): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (!sameExercise(s.exercise, exercise) || s.weight === null) continue;
    if (best === null || s.weight > best) best = s.weight;
  }
  return best;
}

/**
 * Which routine to suggest next: the one after the last session's
 * routine, in routine order (wrapping). Reality beats rotation math —
 * this is a suggestion, every routine stays one tap away.
 */
export function suggestNextRoutine(
  routines: Routine[],
  sessions: Session[],
): Routine | null {
  if (routines.length === 0) return null;
  const finished = sessions
    .filter((s) => s.endedAt !== null)
    .sort((a, b) => b.startedAt - a.startedAt);
  const last = finished[0];
  if (!last || last.routineId === null) return routines[0];
  const idx = routines.findIndex((r) => r.id === last.routineId);
  if (idx === -1) return routines[0];
  return routines[(idx + 1) % routines.length];
}

/** Group a session's sets by exercise, preserving first-logged order. */
export function groupByExercise(
  sets: SetEntry[],
): { exercise: string; sets: SetEntry[] }[] {
  const groups: { exercise: string; sets: SetEntry[] }[] = [];
  for (const s of sets) {
    const group = groups.find((g) => sameExercise(g.exercise, s.exercise));
    if (group) group.sets.push(s);
    else groups.push({ exercise: s.exercise, sets: [s] });
  }
  return groups;
}

/* ---- the owner's program ------------------------------------------------ */

function ex(
  name: string,
  seedWeight: number | null,
  seedReps: number,
  targetSets = 3,
): RoutineExercise {
  return createRoutineExercise(name, targetSets, seedWeight, seedReps);
}

/** Pre-seeded push/pull/legs, from the owner's real training log. */
export function seedRoutines(): Routine[] {
  const now = Date.now();
  return [
    {
      id: makeId(),
      name: "Push",
      createdAt: now,
      exercises: [
        ex("Incline bench press", 85, 7),
        ex("Chest flys", 100, 7),
        ex("Tricep pushdown", 125, 9),
        ex("Tricep pulldown", 25, 7),
        ex("Tricep up", 27.5, 7),
        ex("Flat bench", 70, 10, 2),
        ex("Dips", null, 10, 2),
      ],
    },
    {
      id: makeId(),
      name: "Pull",
      createdAt: now + 1,
      exercises: [
        ex("Preacher curl", 50, 7),
        ex("Hammer curl", 17.5, 10),
        ex("Bayesian curl", 15, 6),
        ex("Lat row", 45, 8),
        ex("Lat pulldown iso", 40, 8),
        ex("Lat pullover", 80, 9),
        ex("Abs crunch", 37.5, 9),
      ],
    },
    {
      id: makeId(),
      name: "Legs",
      createdAt: now + 2,
      exercises: [
        ex("Hip thrust", 100, 8),
        ex("Seated leg press", 175, 8),
        ex("Leg extension", 85, 8),
        ex("Seated leg curl", 75, 8),
        ex("Leg abduction A", null, 9),
        ex("Leg abduction B", 145, 8),
        ex("Lateral raise", 12.5, 8),
        ex("Lateral raise machine", 11.25, 8),
        ex("Traps", 30, 13, 4),
        ex("Abs crunch", 40, 10),
      ],
    },
  ];
}
