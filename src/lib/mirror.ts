import { Preferences } from "@capacitor/preferences";

/**
 * Durability layer. localStorage stays the synchronous source of truth the
 * UI reads at startup, but every write is mirrored to Capacitor Preferences
 * (SharedPreferences on Android). Two things that makes survivable:
 *
 *  - Android occasionally clears WebView storage (updates, corruption);
 *    native preferences are untouched, and we restore from them on launch.
 *  - Android's auto-backup includes SharedPreferences (WebView data is
 *    excluded), so reinstalls and phone transfers recover data too.
 *
 * On the plain web build Preferences falls back to a localStorage shim,
 * which makes the mirror a harmless no-op copy.
 */

export const MIRRORED_KEYS = [
  "reps.sessions",
  "reps.sets",
  "reps.routines",
  "reps.settings",
  "reps.account",
] as const;

/** Fire-and-forget mirror write; storage failures must never break the UI. */
export function mirrorWrite(key: string, value: string): void {
  Preferences.set({ key, value }).catch(() => {});
}

export function mirrorRemove(key: string): void {
  Preferences.remove({ key }).catch(() => {});
}

/**
 * Called once before the app renders. For any key missing from localStorage
 * but present in the native mirror, copy the mirror back — this is the
 * "WebView data was wiped" recovery path.
 */
export async function restoreFromMirror(): Promise<void> {
  try {
    await Promise.all(
      MIRRORED_KEYS.map(async (key) => {
        if (localStorage.getItem(key) !== null) return;
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      }),
    );
  } catch {
    // Recovery is best-effort; the app still works from localStorage.
  }
}
