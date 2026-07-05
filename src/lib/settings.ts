import { mirrorWrite } from "./mirror";

/**
 * User preferences, stored separately from entries so either can evolve
 * independently. Versioned like the entry store.
 */
const SETTINGS_KEY = "reps.settings";
const SETTINGS_VERSION = 1;

export interface Settings {
  /**
   * Daily calorie target. Fresh installs start at 2,000 so the ring is
   * there from the first open; an explicit "remove" stores null.
   */
  dailyGoal: number | null;
  /** Appearance override; "system" follows the OS. */
  theme: "system" | "light" | "dark";
  /**
   * Protein tracking is opt-in — off, the app is pure calories.
   * Installs that predate this switch keep it on (they may have data).
   */
  trackProtein: boolean;
  /** Optional daily protein target in grams; only meaningful when tracking. */
  proteinTarget: number | null;
  /** Accent color family. */
  accent: "azure" | "emerald";
}

const DEFAULTS: Settings = {
  dailyGoal: 2000,
  theme: "system",
  trackProtein: false,
  proteinTarget: null,
  accent: "azure",
};

interface SettingsShape {
  version: number;
  settings: Partial<Settings>;
}

function asTarget(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as SettingsShape;
    const s = parsed?.settings ?? {};
    return {
      dailyGoal: asTarget(s.dailyGoal),
      theme: s.theme === "light" || s.theme === "dark" ? s.theme : "system",
      // Grandfather rule: settings saved before this key existed → on.
      trackProtein:
        typeof s.trackProtein === "boolean" ? s.trackProtein : true,
      proteinTarget: asTarget(s.proteinTarget),
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
