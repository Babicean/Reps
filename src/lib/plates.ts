import { mirrorWrite } from "./mirror";

/**
 * Plate math for barbell lifts: given a total weight, what goes on
 * each side of the bar. Strictly exact — if a weight can't be built
 * from standard plates, we say nothing rather than something wrong.
 *
 * Whether an exercise *is* a barbell lift is the user's call, made
 * once per exercise via a small toggle and remembered here. Machines
 * and dumbbells stay plate-free.
 */

/** A standard Olympic bar. */
export const BAR_KG = 20;

/** Standard plate denominations, heaviest first (kg, per plate). */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Per-side plate breakdown for a total weight, heaviest first.
 * `[]` means the empty bar. `null` means it can't be built exactly
 * (below bar weight, or not loadable with standard plates).
 */
export function plateBreakdown(total: number): number[] | null {
  if (!Number.isFinite(total) || total < BAR_KG) return null;
  let perSide = (total - BAR_KG) / 2;
  // Guard float dust from 0.25-precision inputs (e.g. 62.5 → 21.25).
  perSide = Math.round(perSide * 100) / 100;
  const result: number[] = [];
  for (const plate of PLATES_KG) {
    while (perSide >= plate - 1e-9) {
      result.push(plate);
      perSide = Math.round((perSide - plate) * 100) / 100;
    }
  }
  return perSide > 1e-9 ? null : result;
}

/* ---- which exercises are barbell lifts ---------------------------------- */

const BARBELL_KEY = "reps.barbell";
const STORE_VERSION = 1;

/** The owner's barbell lifts, so day one already has plate math. */
const DEFAULTS = ["incline bench press", "flat bench", "hip thrust"];

const norm = (name: string) => name.trim().toLowerCase();

export function loadBarbellFlags(): Set<string> {
  try {
    const raw = localStorage.getItem(BARBELL_KEY);
    if (!raw) return new Set(DEFAULTS);
    const parsed = JSON.parse(raw) as { exercises?: unknown };
    const list = Array.isArray(parsed?.exercises) ? parsed.exercises : [];
    return new Set(list.filter((e): e is string => typeof e === "string"));
  } catch {
    return new Set(DEFAULTS);
  }
}

export function saveBarbellFlags(flags: Set<string>): void {
  try {
    const json = JSON.stringify({
      version: STORE_VERSION,
      exercises: [...flags],
    });
    localStorage.setItem(BARBELL_KEY, json);
    mirrorWrite(BARBELL_KEY, json);
  } catch {
    // Storage unavailable — the toggle just won't persist.
  }
}

export function isBarbell(name: string, flags: Set<string>): boolean {
  return flags.has(norm(name));
}

export function toggleBarbell(name: string, flags: Set<string>): Set<string> {
  const next = new Set(flags);
  const key = norm(name);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
