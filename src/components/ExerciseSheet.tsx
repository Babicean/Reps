import { FormEvent, useEffect, useState } from "react";
import type { LastTime, SetEntry } from "../types";
import Sheet from "./Sheet";
import { formatDayLabel, formatKg, formatSet } from "../lib/format";
import { parseReps, parseWeight } from "../lib/workout";

interface Props {
  open: boolean;
  exercise: string;
  /** True for the "another exercise" flow, where the name is typed. */
  editableName: boolean;
  lastTime: LastTime | null;
  todaySets: SetEntry[];
  onLog: (
    exercise: string,
    weight: number | null,
    reps: number,
    sourceEl: HTMLElement,
  ) => void;
  onDeleteSet: (id: string) => void;
  onClose: () => void;
}

const WEIGHT_STEP = 2.5;

/**
 * The set logger. "Last time" is the default: the fields prefill from
 * the matching set of the previous session, so a repeat is one tap and
 * progression is a stepper tap. Typing is the fallback, not the flow.
 */
export default function ExerciseSheet({
  open,
  exercise,
  editableName,
  lastTime,
  todaySets,
  onLog,
  onDeleteSet,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Prefill for the set about to be logged: last time's matching set,
  // else today's previous set, else last time's final set.
  const nextIndex = todaySets.length;
  useEffect(() => {
    if (!open) return;
    setName(exercise);
    setError(null);
    const ghost =
      lastTime?.sets[nextIndex] ??
      (todaySets.length > 0
        ? {
            weight: todaySets[todaySets.length - 1].weight,
            reps: todaySets[todaySets.length - 1].reps,
          }
        : (lastTime?.sets[lastTime.sets.length - 1] ?? null));
    setWeight(ghost?.weight != null ? formatKg(ghost.weight) : "");
    setReps(ghost ? String(ghost.reps) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise, nextIndex]);

  const bumpWeight = (delta: number) => {
    const current = parseWeight(weight);
    const base = current === null || current === undefined ? 0 : current;
    const next = Math.max(0, base + delta);
    setWeight(next === 0 ? "" : formatKg(next));
    setError(null);
  };

  const bumpReps = (delta: number) => {
    const current = parseReps(reps) ?? 0;
    const next = Math.max(1, current + delta);
    setReps(String(next));
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name the exercise.");
      return;
    }
    const w = parseWeight(weight);
    if (w === undefined) {
      setError("Weight must be a number of kg (blank for bodyweight).");
      return;
    }
    const r = parseReps(reps);
    if (r === undefined) {
      setError("Reps must be a whole number, 1 to 200.");
      return;
    }
    const el = (e.target as HTMLElement).querySelector(
      ".add-submit",
    ) as HTMLElement;
    onLog(trimmed, w, r, el ?? (e.target as HTMLElement));
  };

  return (
    <Sheet
      open={open}
      title={editableName ? "Another exercise" : exercise}
      onClose={onClose}
    >
      {lastTime && lastTime.sets.length > 0 && (
        <p className="last-line">
          {lastTime.fromSeed
            ? "Your program: "
            : `Last time (${formatDayLabel(lastTime.day).toLowerCase()}): `}
          <strong>
            {lastTime.sets.map((s) => formatSet(s.weight, s.reps)).join(", ")}
          </strong>
        </p>
      )}
      <form onSubmit={submit} noValidate>
        {editableName && (
          <div className="field sheet-name">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={60}
              placeholder="Cable crunch"
              aria-label="Exercise name"
            />
          </div>
        )}
        <div className="stepper-row">
          <span className="stepper-label">Weight</span>
          <div className="stepper">
            <button
              type="button"
              className="step-btn"
              onClick={() => bumpWeight(-WEIGHT_STEP)}
              aria-label={`Minus ${WEIGHT_STEP} kilos`}
            >
              −
            </button>
            <div className="field field-cal step-field">
              <input
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="—"
                aria-label="Weight in kilograms, blank for bodyweight"
              />
              <span className="unit">kg</span>
            </div>
            <button
              type="button"
              className="step-btn"
              onClick={() => bumpWeight(WEIGHT_STEP)}
              aria-label={`Plus ${WEIGHT_STEP} kilos`}
            >
              +
            </button>
          </div>
        </div>
        <div className="stepper-row">
          <span className="stepper-label">Reps</span>
          <div className="stepper">
            <button
              type="button"
              className="step-btn"
              onClick={() => bumpReps(-1)}
              aria-label="One rep fewer"
            >
              −
            </button>
            <div className="field field-cal step-field">
              <input
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  setError(null);
                }}
                inputMode="numeric"
                placeholder="0"
                aria-label="Repetitions"
              />
              <span className="unit">reps</span>
            </div>
            <button
              type="button"
              className="step-btn"
              onClick={() => bumpReps(1)}
              aria-label="One rep more"
            >
              +
            </button>
          </div>
        </div>
        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <button type="submit" className="add-submit">
            Log set {todaySets.length + 1}
          </button>
        </div>
      </form>
      {todaySets.length > 0 && (
        <div className="today-sets">
          {todaySets.map((s, i) => (
            <div key={s.id} className="set-row">
              <span className="set-idx">{i + 1}</span>
              <span className="set-text">{formatSet(s.weight, s.reps)}</span>
              <button
                className="set-del"
                onClick={() => onDeleteSet(s.id)}
                aria-label={`Delete set ${i + 1}`}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M3 3l7 7M10 3l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
