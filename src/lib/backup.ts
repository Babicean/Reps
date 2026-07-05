import type { Routine, Session, SetEntry } from "../types";
import type { Settings } from "./settings";

/**
 * Backup = one JSON file holding everything: sessions, sets, routines,
 * settings. Import merges by id (union), so restoring on a new phone or
 * double-importing never duplicates.
 */
export interface BackupPayload {
  app: "reps";
  version: number;
  exportedAt: number;
  sessions: Session[];
  sets: SetEntry[];
  routines: Routine[];
  settings: Settings;
}

const BACKUP_VERSION = 1;

export function buildBackup(
  sessions: Session[],
  sets: SetEntry[],
  routines: Routine[],
  settings: Settings,
): string {
  const payload: BackupPayload = {
    app: "reps",
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    sessions,
    sets,
    routines,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `reps-backup-${y}-${m}-${d}.json`;
}

/** Parse and sanity-check a backup file; null when it isn't one of ours. */
export function parseBackup(raw: string): BackupPayload | null {
  try {
    const parsed = JSON.parse(raw) as BackupPayload;
    if (parsed?.app !== "reps") return null;
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.sets)) {
      return null;
    }
    const weeklyTarget = parsed.settings?.weeklyTarget;
    const theme = parsed.settings?.theme;
    const accent = parsed.settings?.accent;
    return {
      app: "reps",
      version: typeof parsed.version === "number" ? parsed.version : 1,
      exportedAt:
        typeof parsed.exportedAt === "number" ? parsed.exportedAt : 0,
      sessions: parsed.sessions.filter(
        (s) => s && typeof s.id === "string" && typeof s.day === "string",
      ),
      sets: parsed.sets.filter(
        (s) =>
          s &&
          typeof s.id === "string" &&
          typeof s.exercise === "string" &&
          typeof s.reps === "number",
      ),
      routines: Array.isArray(parsed.routines)
        ? parsed.routines.filter(
            (r) => r && typeof r.id === "string" && Array.isArray(r.exercises),
          )
        : [],
      settings: {
        weeklyTarget:
          typeof weeklyTarget === "number" && weeklyTarget > 0
            ? Math.round(weeklyTarget)
            : null,
        theme: theme === "light" || theme === "dark" ? theme : "system",
        accent: accent === "emerald" ? "emerald" : "azure",
      },
    };
  } catch {
    return null;
  }
}

export interface MergeResult {
  sessions: Session[];
  sets: SetEntry[];
  routines: Routine[];
  addedSessions: number;
  addedSets: number;
  addedRoutines: number;
}

/** Union by id: existing data always wins, imports only add. */
export function mergeBackup(
  sessions: Session[],
  sets: SetEntry[],
  routines: Routine[],
  backup: BackupPayload,
): MergeResult {
  const sessionIds = new Set(sessions.map((s) => s.id));
  const setIds = new Set(sets.map((s) => s.id));
  const routineIds = new Set(routines.map((r) => r.id));
  const routineNames = new Set(
    routines.map((r) => r.name.trim().toLowerCase()),
  );

  const newSessions = backup.sessions.filter((s) => !sessionIds.has(s.id));
  const newSets = backup.sets.filter((s) => !setIds.has(s.id));
  // Routines also dedupe by name so a re-import doesn't duplicate
  // "Push" with a different id.
  const newRoutines = backup.routines.filter(
    (r) =>
      !routineIds.has(r.id) && !routineNames.has(r.name.trim().toLowerCase()),
  );

  return {
    sessions: [...sessions, ...newSessions],
    sets: [...sets, ...newSets],
    routines: [...routines, ...newRoutines],
    addedSessions: newSessions.length,
    addedSets: newSets.length,
    addedRoutines: newRoutines.length,
  };
}
