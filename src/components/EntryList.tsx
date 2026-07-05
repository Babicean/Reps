import { useEffect, useRef, useState } from "react";
import type { Entry } from "../types";
import { groupEntries } from "../lib/store";
import { formatCalories, formatTime } from "../lib/format";

interface Props {
  entries: Entry[];
  trackProtein: boolean;
  onDelete: (id: string) => void;
  onEdit: (entry: Entry) => void;
  /** Log the same thing again — the ⊕ on each row. */
  onRepeat: (entry: Entry, sourceEl: HTMLElement) => void;
}

const LEAVE_MS = 240;

/**
 * Today's entries, collapsed so identical items become one row with a ×N
 * count. ⊕ logs another instance; ✕ removes one instance at a time (the
 * newest), only collapsing the row when the last one goes.
 */
export default function EntryList({
  entries,
  trackProtein,
  onDelete,
  onEdit,
  onRepeat,
}: Props) {
  const groups = groupEntries(entries);

  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  // Group keys rendered at least once — new keys after mount animate in.
  const seenRef = useRef<Set<string> | null>(null);
  if (seenRef.current === null) {
    seenRef.current = new Set(groups.map((g) => g.key));
  }
  const seen = seenRef.current;

  useEffect(() => {
    for (const g of groups) seen.add(g.key);
  }, [groups, seen]);

  const remove = (groupKey: string, items: Entry[]) => {
    if (items.length > 1) {
      // Just decrement: drop the newest instance, row stays put.
      onDelete(items[0].id);
      return;
    }
    setLeaving((prev) => new Set(prev).add(groupKey));
    window.setTimeout(() => {
      onDelete(items[0].id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(groupKey);
        return next;
      });
    }, LEAVE_MS);
  };

  if (entries.length === 0) {
    return (
      <div className="card empty">
        <svg
          className="empty-icon"
          viewBox="0 0 52 52"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="26"
            cy="26"
            r="20"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.5"
          />
          <circle cx="26" cy="26" r="9" stroke="currentColor" strokeWidth="2" />
        </svg>
        <p className="empty-title">Nothing logged yet</p>
        <p className="empty-sub">Add your first entry to start today’s reps.</p>
      </div>
    );
  }

  return (
    <div className="card entry-list">
      {groups.map((group) => {
        const newest = group.items[0];
        const count = group.items.length;
        const showProtein = trackProtein && group.totalProtein > 0;
        const label = newest.description || formatTime(newest.timestamp);
        const isNew = !seen.has(group.key);
        const isLeaving = leaving.has(group.key);
        return (
          <div
            key={group.key}
            className={`entry-shell${isLeaving ? " leaving" : ""}${
              isNew ? " entering" : ""
            }`}
          >
            <div className="entry-clip">
              <div className="entry-row">
                <button
                  className="entry-main"
                  onClick={() => onEdit(newest)}
                  aria-label={`Edit ${label} (${group.totalCalories} calories)`}
                >
                  <span className="entry-text">
                    <span className="entry-title">
                      {label}
                      {count > 1 && (
                        <span className="entry-count">×{count}</span>
                      )}
                    </span>
                    {(newest.description || showProtein) && (
                      <span className="entry-time">
                        {newest.description
                          ? formatTime(newest.timestamp)
                          : null}
                        {newest.description && showProtein && " · "}
                        {showProtein && `${group.totalProtein} g protein`}
                      </span>
                    )}
                  </span>
                  <span className="entry-cal">
                    +{formatCalories(group.totalCalories)}
                    <span className="unit">cal</span>
                  </span>
                </button>
                <button
                  className="entry-repeat"
                  onClick={(e) => onRepeat(newest, e.currentTarget)}
                  aria-label={`Log ${label} again (${newest.calories} calories)`}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2.5v9M2.5 7h9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  className="entry-delete"
                  onClick={() => remove(group.key, group.items)}
                  aria-label={
                    count > 1
                      ? `Remove one ${label} (${count} logged)`
                      : `Delete ${label} (${newest.calories} calories)`
                  }
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d={count > 1 ? "M3 7h8" : "M3 3l8 8M11 3l-8 8"}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
