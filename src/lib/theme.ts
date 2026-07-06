import { Capacitor } from "@capacitor/core";
import { loadSettings } from "./settings";

export type ThemePref = "system" | "light" | "dark";
export type AccentPref = "azure" | "emerald" | "ember";

/** Stamp the accent family on <html>; CSS tokens key off it. */
export function applyAccent(accent: AccentPref): void {
  const root = document.documentElement;
  if (accent === "azure") {
    delete root.dataset.accent;
  } else {
    root.dataset.accent = accent;
  }
}

export function isThemePref(value: unknown): value is ThemePref {
  return value === "system" || value === "light" || value === "dark";
}

function effectiveDark(pref: ThemePref): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Apply a theme preference: stamps `data-theme` on <html> (the CSS tokens
 * key off it) and, in the native app, restyles the Android status bar so a
 * forced theme doesn't clash with the system's bars.
 */
export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = pref;
  }
  void syncNativeBars(pref);
}

async function syncNativeBars(pref: ThemePref): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const dark = effectiveDark(pref);
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: dark ? "#121316" : "#f5f6f8",
    });
  } catch {
    // Web build or plugin unavailable — CSS alone is fine.
  }
}

/** Re-sync native bars when the system scheme flips while on "System". */
export function watchSystemTheme(): void {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const pref = loadSettings().theme;
      if (pref === "system") void syncNativeBars(pref);
    });
}
