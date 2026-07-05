import { useState } from "react";
import type { MenuItem } from "../types";
import { formatCalories } from "../lib/format";
import { flyCalories, haptic } from "../lib/fly";
import { useToast } from "../hooks/useToast";
import MenuItemSheet from "./MenuItemSheet";
import CategoryIcon, { CategoryId } from "./CategoryIcon";
import Toast from "./Toast";

interface Props {
  menu: MenuItem[];
  trackProtein: boolean;
  onLog: (item: MenuItem) => void;
  onAdd: (
    name: string,
    calories: number,
    protein: number | null,
    category: string | null,
  ) => void;
  onUpdate: (
    id: string,
    name: string,
    calories: number,
    protein: number | null,
    category: string | null,
  ) => void;
  onDelete: (id: string) => void;
  onTogglePinned: (id: string) => void;
}

/**
 * The user's saved staples. Every row can log itself to today in one tap;
 * pinned rows also surface as chips on the Today screen.
 */
export default function MenuScreen({
  menu,
  trackProtein,
  onLog,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePinned,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const { toast, showConfirmation } = useToast();

  const log = (item: MenuItem, el: HTMLElement) => {
    onLog(item);
    flyCalories(`+${formatCalories(item.calories)}`, el);
    haptic(10);
    showConfirmation();
  };

  return (
    <div className="screen">
      <div className="menu-head">
        <h1 className="history-title">Menu</h1>
        <button
          className="menu-add"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New item
        </button>
      </div>

      {menu.length === 0 ? (
        <div className="card empty history-empty">
          <svg
            className="empty-icon"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M18 8v14a4 4 0 01-4 4h0a4 4 0 01-4-4V8M14 8v36"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M36 28c-3.5 0-6-4.5-6-11 0-5 2.5-9 6-9s6 4 6 9c0 6.5-2.5 11-6 11zm0 0v16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="empty-title">Your regulars live here</p>
          <p className="empty-sub">
            Save the things you eat all the time, then log them in one tap.
            Pin favourites to keep them on the Today screen.
          </p>
        </div>
      ) : (
        <div className="card menu-list">
          {menu.map((item) => (
            <div key={item.id} className="menu-row">
              <button
                className="menu-main"
                onClick={() => {
                  setEditing(item);
                  setSheetOpen(true);
                }}
                aria-label={`Edit ${item.name}`}
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
              </button>
              <button
                className={`menu-pin${item.pinned ? " pinned" : ""}`}
                onClick={() => {
                  onTogglePinned(item.id);
                  haptic(6);
                }}
                aria-label={
                  item.pinned
                    ? `Unpin ${item.name} from Today`
                    : `Pin ${item.name} to Today`
                }
                aria-pressed={item.pinned}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path
                    d="M8 1.8l1.85 3.75 4.15.6-3 2.92.71 4.13L8 11.25l-3.71 1.95.71-4.13-3-2.92 4.15-.6L8 1.8z"
                    fill={item.pinned ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="menu-log"
                onClick={(e) => log(item, e.currentTarget)}
                aria-label={`Log ${item.name} (${item.calories} calories)`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <MenuItemSheet
        open={sheetOpen}
        trackProtein={trackProtein}
        item={editing}
        onSave={(name, cal, prot, category) => {
          if (editing) onUpdate(editing.id, name, cal, prot, category);
          else onAdd(name, cal, prot, category);
        }}
        onDelete={editing ? () => onDelete(editing.id) : undefined}
        onClose={() => setSheetOpen(false)}
      />
      <Toast toast={toast} />
    </div>
  );
}
