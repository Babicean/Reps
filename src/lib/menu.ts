import type { Entry, MenuItem } from "../types";
import { frequentEntries, type FrequentItem } from "./store";
import { categoryOrder, isCategoryId } from "../components/CategoryIcon";
import { mirrorWrite } from "./mirror";

/**
 * The user's saved staples ("Menu"), stored under their own versioned key so
 * the entry log and the menu can evolve independently.
 */
const MENU_KEY = "reps.menu";
const MENU_VERSION = 1;

interface MenuShape {
  version: number;
  items: MenuItem[];
}

export function isMenuItem(value: unknown): value is MenuItem {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.calories === "number" &&
    Number.isFinite(m.calories) &&
    (m.protein === null || typeof m.protein === "number") &&
    typeof m.pinned === "boolean"
  );
}

export function loadMenu(): MenuItem[] {
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MenuShape;
    if (!parsed || !Array.isArray(parsed.items)) return [];
    return parsed.items.filter(isMenuItem).map((m) => ({
      ...m,
      // Items saved before categories existed load as uncategorized.
      category: isCategoryId(m.category) ? m.category : null,
    }));
  } catch {
    return [];
  }
}

export function saveMenu(items: MenuItem[]): void {
  try {
    const payload: MenuShape = { version: MENU_VERSION, items };
    const json = JSON.stringify(payload);
    localStorage.setItem(MENU_KEY, json);
    mirrorWrite(MENU_KEY, json);
  } catch {
    // Storage unavailable — in-memory state still works.
  }
}

export function createMenuItem(
  name: string,
  calories: number,
  protein: number | null,
  category: string | null = null,
  now: number = Date.now(),
): MenuItem {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${now}-${Math.random().toString(36).slice(2, 10)}`,
    name: name.trim(),
    calories,
    protein,
    pinned: false,
    category,
    createdAt: now,
  };
}

/**
 * Menu display order: pinned first, then grouped by category (so the little
 * icons cluster visually), then alphabetical.
 */
export function sortMenu(items: MenuItem[]): MenuItem[] {
  return [...items].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      categoryOrder(a.category) - categoryOrder(b.category) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Parse an optional protein input. Empty string means "not tracked" (null);
 * otherwise it must be a reasonable whole number of grams.
 */
export function parseProtein(raw: string): number | null | undefined {
  const cleaned = raw.trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const value = Math.round(Number(cleaned));
  if (value < 0 || value > 1000) return undefined;
  return value;
}

/**
 * Quick-add chips for the Today screen: pinned menu items first, then
 * auto-learned frequent entries (skipping any that duplicate a pinned item).
 */
export function buildQuickAdds(
  menu: MenuItem[],
  entries: Entry[],
  limit = 6,
): FrequentItem[] {
  const pinned: FrequentItem[] = sortMenu(menu)
    .filter((m) => m.pinned)
    .map((m) => ({
      description: m.name,
      calories: m.calories,
      protein: m.protein,
    }));

  const taken = new Set(
    pinned.map((p) => `${p.description.toLowerCase()}|${p.calories}`),
  );
  const learned = frequentEntries(entries, limit).filter(
    (f) => !taken.has(`${f.description.toLowerCase()}|${f.calories}`),
  );

  return [...pinned, ...learned].slice(0, limit);
}
