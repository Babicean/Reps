import { FormEvent, useEffect, useState } from "react";
import type { Routine, RoutineExercise } from "../types";
import Sheet from "./Sheet";
import { formatSet } from "../lib/format";
import {
  createRoutineExercise,
  makeId,
  parseReps,
  parseWeight,
} from "../lib/workout";

interface Props {
  open: boolean;
  /** Routine being edited, or null when creating a new one. */
  routine: Routine | null;
  onSave: (routine: Routine) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/** Editor for one routine: name plus an ordered exercise list. */
export default function RoutineSheet({
  open,
  routine,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [exName, setExName] = useState("");
  const [exWeight, setExWeight] = useState("");
  const [exReps, setExReps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(routine?.name ?? "");
      setExercises(routine?.exercises.map((e) => ({ ...e })) ?? []);
      setExName("");
      setExWeight("");
      setExReps("");
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, routine]);

  const move = (index: number, delta: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addExercise = () => {
    const trimmed = exName.trim();
    if (!trimmed) {
      setError("Name the exercise first.");
      return;
    }
    const w = parseWeight(exWeight);
    if (w === undefined) {
      setError("Seed weight must be kg (blank for bodyweight).");
      return;
    }
    const r = exReps.trim() === "" ? 8 : parseReps(exReps);
    if (r === undefined) {
      setError("Seed reps must be a whole number.");
      return;
    }
    setExercises((prev) => [...prev, createRoutineExercise(trimmed, 3, w, r)]);
    setExName("");
    setExWeight("");
    setExReps("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the routine a name.");
      return;
    }
    onSave({
      id: routine?.id ?? makeId(),
      name: trimmed,
      exercises,
      createdAt: routine?.createdAt ?? Date.now(),
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      title={routine ? "Edit routine" : "New routine"}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="field sheet-name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={30}
            placeholder="Push"
            aria-label="Routine name"
          />
        </div>

        {exercises.length > 0 && (
          <div className="rex-list">
            {exercises.map((ex, i) => (
              <div key={ex.id} className="rex-row">
                <span className="menu-text">
                  <span className="menu-name">{ex.name}</span>
                  <span className="menu-detail">
                    {formatSet(ex.seedWeight, ex.seedReps)} · {ex.targetSets}{" "}
                    sets
                  </span>
                </span>
                <button
                  type="button"
                  className="rex-btn"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${ex.name} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rex-btn"
                  onClick={() => move(i, 1)}
                  disabled={i === exercises.length - 1}
                  aria-label={`Move ${ex.name} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rex-btn rex-del"
                  onClick={() =>
                    setExercises((prev) => prev.filter((x) => x.id !== ex.id))
                  }
                  aria-label={`Remove ${ex.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="settings-label">Add exercise</p>
        <div className="field sheet-name">
          <input
            value={exName}
            onChange={(e) => {
              setExName(e.target.value);
              setError(null);
            }}
            maxLength={60}
            placeholder="Incline bench press"
            aria-label="Exercise name"
          />
        </div>
        <div className="sheet-fields">
          <div className="field field-cal">
            <input
              value={exWeight}
              onChange={(e) => {
                setExWeight(e.target.value);
                setError(null);
              }}
              inputMode="decimal"
              placeholder="—"
              aria-label="Seed weight in kilograms (blank for bodyweight)"
            />
            <span className="unit">kg</span>
          </div>
          <div className="field field-cal">
            <input
              value={exReps}
              onChange={(e) => {
                setExReps(e.target.value);
                setError(null);
              }}
              inputMode="numeric"
              placeholder="8"
              aria-label="Seed reps"
            />
            <span className="unit">reps</span>
          </div>
          <button
            type="button"
            className="rex-add"
            onClick={addExercise}
            aria-label="Add exercise to routine"
          >
            +
          </button>
        </div>

        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}

        <div className="sheet-actions">
          <button type="submit" className="add-submit">
            {routine ? "Save routine" : "Create routine"}
          </button>
          {routine && onDelete && (
            <button
              type="button"
              className="sheet-secondary"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                onDelete();
                onClose();
              }}
            >
              {confirmDelete
                ? "Tap again to delete this routine"
                : "Delete routine"}
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
