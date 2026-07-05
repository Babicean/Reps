import type { MenuItem } from "../types";
import Sheet from "./Sheet";
import { formatCalories } from "../lib/format";
import CategoryIcon, { CategoryId } from "./CategoryIcon";

interface Props {
  open: boolean;
  menu: MenuItem[];
  trackProtein: boolean;
  onPick: (item: MenuItem, sourceEl: HTMLElement) => void;
  onClose: () => void;
}

/**
 * Quick picker over the saved Menu, opened from the Today screen's chip
 * row. Same rows as the Menu tab, but every tap logs to today — editing
 * and pinning stay on the Menu tab.
 */
export default function MenuPickSheet({
  open,
  menu,
  trackProtein,
  onPick,
  onClose,
}: Props) {
  return (
    <Sheet open={open} title="From the Menu" onClose={onClose}>
      <p className="sheet-sub">One tap logs it to today.</p>
      <div className="pick-list" role="list">
        {menu.map((item) => (
          <button
            key={item.id}
            role="listitem"
            className="pick-row"
            onClick={(e) => onPick(item, e.currentTarget)}
            aria-label={`Log ${item.name} (${item.calories} calories)`}
          >
            <span className="menu-tile" aria-hidden="true">
              <CategoryIcon id={item.category as CategoryId | null} />
            </span>
            <span className="menu-text">
              <span className="menu-name">{item.name}</span>
              <span className="menu-detail">
                {formatCalories(item.calories)} cal
                {trackProtein &&
                  item.protein != null &&
                  ` · ${item.protein} g protein`}
              </span>
            </span>
            <span className="menu-log" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
