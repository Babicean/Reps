import { FormEvent, useEffect, useState } from "react";
import type { DayKey } from "../types";
import Sheet from "./Sheet";
import { parseCalories } from "../lib/store";
import { parseProtein } from "../lib/menu";
import { fromDayKey } from "../lib/day";
import { formatDayLabel } from "../lib/format";

interface Props {
  /** The tracking day being amended, or null when closed. */
  day: DayKey | null;
  trackProtein: boolean;
  onAdd: (
    calories: number,
    description: string,
    protein: number | null,
    when: Date,
  ) => void;
  onClose: () => void;
}

/** Add a forgotten entry to a past day (logged at noon of that day). */
export default function BackdateSheet({
  day,
  trackProtein,
  onAdd,
  onClose,
}: Props) {
  const [calories, setCalories] = useState("");
  const [description, setDescription] = useState("");
  const [protein, setProtein] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (day) {
      setCalories("");
      setDescription("");
      setProtein("");
      setError(false);
    }
  }, [day]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!day) return;
    const cal = parseCalories(calories);
    const prot = trackProtein ? parseProtein(protein) : null;
    if (cal === null || prot === undefined) {
      setError(true);
      return;
    }
    // Noon keeps the entry safely inside the day's 2 AM–2 AM window.
    const when = fromDayKey(day);
    when.setHours(12, 0, 0, 0);
    onAdd(cal, description, prot, when);
    onClose();
  };

  return (
    <Sheet
      open={day !== null}
      title={day ? `Add to ${formatDayLabel(day)}` : "Add entry"}
      onClose={onClose}
    >
      <p className="sheet-sub">
        For the things you forgot to log. It counts toward this day's total
        and keeps your streak honest.
      </p>
      <form onSubmit={submit} noValidate>
        <div className="field sheet-name">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={80}
            placeholder="Note (optional)"
            aria-label="Description"
          />
        </div>
        <div className="sheet-fields">
          <div className={`field field-cal${error ? " invalid" : ""}`}>
            <input
              value={calories}
              onChange={(e) => {
                setCalories(e.target.value);
                setError(false);
              }}
              inputMode="numeric"
              placeholder="500"
              aria-label="Calories"
            />
            <span className="unit">cal</span>
          </div>
          {trackProtein && (
            <div className="field field-cal field-protein">
              <input
                value={protein}
                onChange={(e) => {
                  setProtein(e.target.value);
                  setError(false);
                }}
                inputMode="numeric"
                  aria-label="Protein in grams (optional)"
              />
              <span className="unit">g protein</span>
            </div>
          )}
        </div>
        {error && (
          <p className="add-error" role="alert">
            Calories must be 1–20,000; protein 0–1,000 grams or blank.
          </p>
        )}
        <div className="sheet-actions">
          <button type="submit" className="add-submit">
            Add entry
          </button>
        </div>
      </form>
    </Sheet>
  );
}
