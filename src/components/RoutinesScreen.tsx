import { useState } from "react";
import type { Routine } from "../types";
import { formatSet } from "../lib/format";
import RoutineSheet from "./RoutineSheet";

interface Props {
  routines: Routine[];
  onAdd: (routine: Routine) => void;
  onUpdate: (routine: Routine) => void;
  onDelete: (id: string) => void;
}

/**
 * The workout templates: Push, Pull, Legs, … Each is an ordered list of
 * exercises with program seeds; sessions start from these on Today.
 */
export default function RoutinesScreen({
  routines,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);

  return (
    <div className="screen">
      <div className="menu-head">
        <h1 className="history-title">Routines</h1>
        <button
          className="menu-add"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          + New routine
        </button>
      </div>

      {routines.length === 0 ? (
        <div className="card empty history-empty">
          <p className="empty-title">Your program lives here</p>
          <p className="empty-sub">
            Build a routine — an ordered list of exercises — and start it
            from the Today tab.
          </p>
        </div>
      ) : (
        <div className="card menu-list">
          {routines.map((routine) => (
            <div key={routine.id} className="menu-row">
              <button
                className="menu-main"
                onClick={() => {
                  setEditing(routine);
                  setSheetOpen(true);
                }}
                aria-label={`Edit ${routine.name}`}
              >
                <span className="menu-text">
                  <span className="menu-name">{routine.name}</span>
                  <span className="menu-detail">
                    {routine.exercises.length} exercise
                    {routine.exercises.length === 1 ? "" : "s"}
                    {routine.exercises.length > 0 &&
                      ` · ${routine.exercises
                        .slice(0, 3)
                        .map((e) => e.name)
                        .join(", ")}${routine.exercises.length > 3 ? "…" : ""}`}
                  </span>
                </span>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="settings-foot">
        Tap an exercise's seed — e.g. {formatSet(85, 7)} — and it becomes
        the ghost your first set is measured against.
      </p>

      <RoutineSheet
        open={sheetOpen}
        routine={editing}
        onSave={(routine) => {
          if (editing) onUpdate(routine);
          else onAdd(routine);
        }}
        onDelete={editing ? () => onDelete(editing.id) : undefined}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
