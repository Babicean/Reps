import type { Entry, MenuItem } from "../types";
import { isEntry } from "./store";
import { isMenuItem } from "./menu";
import type { Settings } from "./settings";

/**
 * Backup = one JSON file holding everything: entries, menu, settings.
 * Import merges by id, so restoring an old backup never duplicates data.
 */

export const BACKUP_VERSION = 1;

export interface BackupPayload {
  app: "reps";
  version: number;
  exportedAt: string;
  entries: Entry[];
  menu: MenuItem[];
  settings: Settings;
}

export function buildBackup(
  entries: Entry[],
  menu: MenuItem[],
  settings: Settings,
  now: Date = new Date(),
): BackupPayload {
  return {
    app: "reps",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries,
    menu,
    settings,
  };
}

/** Suggested filename, e.g. "reps-backup-2026-07-04.json". */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `reps-backup-${y}-${m}-${d}.json`;
}

/** Parse and validate a backup file. Returns null for anything unusable. */
export function parseBackup(json: string): BackupPayload | null {
  try {
    const raw = JSON.parse(json) as Partial<BackupPayload>;
    if (!raw || raw.app !== "reps" || !Array.isArray(raw.entries)) {
      return null;
    }
    const goal = raw.settings?.dailyGoal;
    const theme = raw.settings?.theme;
    const trackProtein = raw.settings?.trackProtein;
    const proteinTarget = raw.settings?.proteinTarget;
    const accent = raw.settings?.accent;
    return {
      app: "reps",
      version: typeof raw.version === "number" ? raw.version : 1,
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      entries: raw.entries.filter(isEntry),
      menu: Array.isArray(raw.menu) ? raw.menu.filter(isMenuItem) : [],
      settings: {
        dailyGoal:
          typeof goal === "number" && Number.isFinite(goal) && goal > 0
            ? Math.round(goal)
            : null,
        theme: theme === "light" || theme === "dark" ? theme : "system",
        trackProtein: typeof trackProtein === "boolean" ? trackProtein : false,
        proteinTarget:
          typeof proteinTarget === "number" &&
          Number.isFinite(proteinTarget) &&
          proteinTarget > 0
            ? Math.round(proteinTarget)
            : null,
        accent: accent === "emerald" ? "emerald" : "azure",
      },
    };
  } catch {
    return null;
  }
}

export interface MergeResult {
  entries: Entry[];
  menu: MenuItem[];
  addedEntries: number;
  addedItems: number;
}

/**
 * Merge a backup into current data. Union by id — current records always
 * win, imported records only fill gaps. Safe to run repeatedly.
 */
export function mergeBackup(
  currentEntries: Entry[],
  currentMenu: MenuItem[],
  backup: BackupPayload,
): MergeResult {
  const haveEntry = new Set(currentEntries.map((e) => e.id));
  const newEntries = backup.entries.filter((e) => !haveEntry.has(e.id));

  const haveItem = new Set(currentMenu.map((m) => m.id));
  const newItems = backup.menu.filter((m) => !haveItem.has(m.id));

  return {
    entries: [...currentEntries, ...newEntries],
    menu: [...currentMenu, ...newItems],
    addedEntries: newEntries.length,
    addedItems: newItems.length,
  };
}
