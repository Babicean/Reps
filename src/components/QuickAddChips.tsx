import type { FrequentItem } from "../lib/store";
import { formatCalories } from "../lib/format";

interface Props {
  items: FrequentItem[];
  /** Whether the Menu has anything worth browsing. */
  menuAvailable: boolean;
  onBrowseMenu: () => void;
  onAdd: (item: FrequentItem, sourceEl: HTMLElement) => void;
}

/**
 * One-tap pills for the user's habitual entries, led by a Menu chip that
 * opens the saved-staples picker. Habit chips appear only once the same
 * item has been logged at least twice, so day one stays uncluttered.
 */
export default function QuickAddChips({
  items,
  menuAvailable,
  onBrowseMenu,
  onAdd,
}: Props) {
  if (items.length === 0 && !menuAvailable) return null;
  return (
    <div className="chips" role="list" aria-label="Quick add">
      {menuAvailable && (
        <button
          role="listitem"
          className="chip chip-menu"
          onClick={onBrowseMenu}
          aria-label="Add from Menu"
        >
          <svg width="14" height="14" viewBox="0 0 17 17" fill="none" aria-hidden="true">
            <path
              d="M5 2v4.5a2 2 0 01-2 2h0a2 2 0 01-2-2V2M3.5 2v13M12.75 10c-1.5 0-2.5-1.8-2.5-4.25S11.35 2 12.75 2 15 3.8 15 5.75 14.25 10 12.75 10zm0 0v5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Menu
        </button>
      )}
      {items.map((item) => (
        <button
          key={`${item.description}|${item.calories}`}
          role="listitem"
          className="chip"
          onClick={(e) => onAdd(item, e.currentTarget)}
        >
          <span className="chip-plus" aria-hidden="true">
            +
          </span>
          {item.description}
          <span className="chip-cal">{formatCalories(item.calories)}</span>
        </button>
      ))}
    </div>
  );
}
