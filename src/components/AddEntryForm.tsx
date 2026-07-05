import { FormEvent, useRef, useState } from "react";
import { MAX_CALORIES, parseCalories } from "../lib/store";
import { formatCalories } from "../lib/format";

interface Props {
  onAdd: (calories: number, description: string, sourceEl: HTMLElement) => void;
}

export default function AddEntryForm({ onAdd }: Props) {
  const [calories, setCalories] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const calRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCalories(calories);
    if (parsed === null) {
      setError(
        calories.trim() === ""
          ? "Enter how many calories to add."
          : `Calories must be a positive number up to ${formatCalories(MAX_CALORIES)}.`,
      );
      setShaking(true);
      window.setTimeout(() => setShaking(false), 400);
      calRef.current?.focus();
      return;
    }
    onAdd(parsed, description, submitRef.current ?? calRef.current!);
    setCalories("");
    setDescription("");
    setError(null);
    calRef.current?.focus();
  };

  return (
    <form className="card add-card" onSubmit={submit} noValidate>
      <div className="add-fields">
        <div className={`field field-cal${shaking ? " invalid" : ""}`}>
          <input
            ref={calRef}
            value={calories}
            onChange={(e) => {
              setCalories(e.target.value);
              if (error) setError(null);
            }}
            inputMode="numeric"
            enterKeyHint="done"
            placeholder="500"
            aria-label="Calories"
            aria-invalid={error !== null}
          />
          <span className="unit">cal</span>
        </div>
        <div className="field">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={80}
            enterKeyHint="done"
            placeholder="Note"
            aria-label="Description"
          />
        </div>
        <button
          ref={submitRef}
          type="submit"
          className="add-submit"
          aria-label="Add entry"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 3.5v11M3.5 9h11"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {error && (
        <p className="add-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
