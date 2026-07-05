import { FormEvent, useEffect, useState } from "react";
import type { Entry } from "../types";
import Sheet from "./Sheet";
import { parseCalories } from "../lib/store";
import { parseProtein } from "../lib/menu";

interface Props {
  entry: Entry | null;
  trackProtein: boolean;
  onSave: (
    id: string,
    calories: number,
    description: string,
    protein: number | null,
    timestamp: number,
  ) => void;
  onClose: () => void;
}

/** Epoch ms → the local value string a datetime-local input expects. */
function toLocalInputValue(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function EditEntrySheet({
  entry,
  trackProtein,
  onSave,
  onClose,
}: Props) {
  const [calories, setCalories] = useState("");
  const [description, setDescription] = useState("");
  const [protein, setProtein] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (entry) {
      setCalories(String(entry.calories));
      setDescription(entry.description);
      setProtein(entry.protein != null ? String(entry.protein) : "");
      setWhen(toLocalInputValue(entry.timestamp));
      setError(null);
    }
  }, [entry]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    const parsed = parseCalories(calories);
    const parsedProtein = trackProtein ? parseProtein(protein) : entry.protein ?? null;
    if (parsed === null || parsedProtein === undefined) {
      setError("Calories must be 1–20,000; protein 0–1,000 grams or blank.");
      return;
    }
    const ts = when ? new Date(when).getTime() : entry.timestamp;
    if (!Number.isFinite(ts)) {
      setError("That date doesn’t look right.");
      return;
    }
    if (ts > Date.now() + 60_000) {
      setError("Can’t log into the future.");
      return;
    }
    onSave(entry.id, parsed, description, parsedProtein, ts);
    onClose();
  };

  return (
    <Sheet open={entry !== null} title="Edit entry" onClose={onClose}>
      <p className="sheet-sub">
        Change what it was, how much, or when. Moving the time moves it to
        the right day automatically.
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
                setError(null);
              }}
              inputMode="numeric"
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
                  setError(null);
                }}
                inputMode="numeric"
                  aria-label="Protein in grams (optional)"
              />
              <span className="unit">g protein</span>
            </div>
          )}
        </div>
        <div className="field sheet-name sheet-when">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => {
              setWhen(e.target.value);
              setError(null);
            }}
            aria-label="Logged at"
          />
        </div>
        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <button type="submit" className="add-submit">
            Save changes
          </button>
        </div>
      </form>
    </Sheet>
  );
}
