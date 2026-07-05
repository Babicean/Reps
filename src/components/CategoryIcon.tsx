/**
 * Fixed category presets for Menu items. Icons are tiny monochrome line
 * glyphs drawn in the same stroke style as the tab bar — deliberately not
 * emoji, so they stay calm in both themes.
 */
export type CategoryId =
  | "meal"
  | "meat"
  | "drink"
  | "coffee"
  | "snack"
  | "sweet"
  | "junk"
  | "shake";

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

const GLYPHS: Record<CategoryId, JSX.Element> = {
  // Bowl with chopstick-steam
  meal: (
    <g {...STROKE}>
      <path d="M3.5 10.5h13a6.5 6.5 0 01-4.5 6h-4a6.5 6.5 0 01-4.5-6z" />
      <path d="M7 7.5c0-1.2 1-1.4 1-2.5M11 7.5c0-1.2 1-1.4 1-2.5" />
    </g>
  ),
  // Drumstick: round of meat, a short leg bone, two knuckles
  meat: (
    <g {...STROKE}>
      <circle cx="11.8" cy="7.2" r="4.4" />
      <path d="M8.7 10.3l-3.6 3.6" />
      <circle cx="4" cy="13.2" r="1.3" />
      <circle cx="5.8" cy="15" r="1.3" />
    </g>
  ),
  // Cup with straw
  drink: (
    <g {...STROKE}>
      <path d="M5.5 7h9l-1.1 9.2a1.5 1.5 0 01-1.5 1.3H8.1a1.5 1.5 0 01-1.5-1.3L5.5 7z" />
      <path d="M9.5 7l2.2-4.5" />
    </g>
  ),
  // Coffee cup with handle
  coffee: (
    <g {...STROKE}>
      <path d="M4.5 8h9v4.5a4 4 0 01-4 4h-1a4 4 0 01-4-4V8z" />
      <path d="M13.5 9h1a2 2 0 010 4h-1M7 5.5c0-1 .8-1.1.8-2M10.5 5.5c0-1 .8-1.1.8-2" />
    </g>
  ),
  // Cookie with scattered chips (deliberately irregular — no face pattern)
  snack: (
    <g {...STROKE}>
      <circle cx="10" cy="10.5" r="6" />
      <circle cx="7.4" cy="8.6" r="0.45" fill="currentColor" />
      <circle cx="11.9" cy="7.6" r="0.45" fill="currentColor" />
      <circle cx="9.3" cy="11.2" r="0.45" fill="currentColor" />
      <circle cx="12.8" cy="12.1" r="0.45" fill="currentColor" />
      <circle cx="7.9" cy="13.5" r="0.45" fill="currentColor" />
    </g>
  ),
  // Ice cream cone
  sweet: (
    <g {...STROKE}>
      <path d="M6.2 9.5a3.8 3.8 0 117.6 0" />
      <path d="M6.2 9.5h7.6L10 17.5 6.2 9.5z" />
    </g>
  ),
  // Fries
  junk: (
    <g {...STROKE}>
      <path d="M5.5 9l1 8h7l1-8" />
      <path d="M7 9V4.5M10 9V3.5M13 9V4.5" />
      <path d="M4.5 9h11" />
    </g>
  ),
  // Shaker bottle
  shake: (
    <g {...STROKE}>
      <path d="M7 6.5h6l-.8 10a1.2 1.2 0 01-1.2 1H9a1.2 1.2 0 01-1.2-1L7 6.5z" />
      <path d="M7.5 4.5h5V6.5h-5zM9 2.5h2" />
      <path d="M8 10.5h4" />
    </g>
  ),
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "meal", label: "Meal" },
  { id: "meat", label: "Meat" },
  { id: "drink", label: "Drink" },
  { id: "coffee", label: "Coffee" },
  { id: "snack", label: "Snack" },
  { id: "sweet", label: "Sweet" },
  { id: "junk", label: "Junk" },
  { id: "shake", label: "Shake" },
];

export function isCategoryId(value: unknown): value is CategoryId {
  return (
    typeof value === "string" && CATEGORIES.some((c) => c.id === value)
  );
}

/** Display order index, for sorting the menu list by category. */
export function categoryOrder(id: string | null | undefined): number {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i === -1 ? CATEGORIES.length : i;
}

export default function CategoryIcon({
  id,
  size = 20,
}: {
  id: CategoryId | null | undefined;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      {id && GLYPHS[id] ? (
        GLYPHS[id]
      ) : (
        // No category: a quiet dot.
        <circle cx="10" cy="10" r="2.5" fill="currentColor" opacity="0.5" />
      )}
    </svg>
  );
}
