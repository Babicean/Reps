import { mirrorWrite } from "./mirror";

/**
 * User preferences, stored separately from workout data so either can
 * evolve independently. Versioned like the workout store.
 */
const SETTINGS_KEY = "reps.settings";
const SETTINGS_VERSION = 1;

export interface Settings {
  /**
   * Weekly session target. Fresh installs start at 3 (the owner's
   * push/pull/sometimes-legs reality); an explicit "remove" stores null.
   */
  weeklyTarget: number | null;
  /** Appearance override; "system" follows the OS. */
  theme: "system" | "light" | "dark";
  /** Accent color family. */
  accent: "azure" | "emerald";
}

const DEFAULTS: Settings = {
  weeklyTarget: 3,
  theme: "system",
  accent: "azure",
};

interface SettingsShape {
  version: number;
  settings: Partial<Settings>;
}

function asTarget(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(14, Math.round(value))
    : null;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as SettingsShape;
    const s = parsed?.settings ?? {};
    return {
      weeklyTarget: asTarget(s.weeklyTarget),
      theme: s.theme === "light" || s.theme === "dark" ? s.theme : "system",
      accent: s.accent === "emerald" ? "emerald" : "azure",
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    const payload: SettingsShape = { version: SETTINGS_VERSION, settings };
    const json = JSON.stringify(payload);
    localStorage.setItem(SETTINGS_KEY, json);
    mirrorWrite(SETTINGS_KEY, json);
  } catch {
    // Storage unavailable — settings just won't persist.
  }
}
