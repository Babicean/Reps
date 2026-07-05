import { FormEvent, useEffect, useState } from "react";
import type { MenuItem } from "../types";
import Sheet from "./Sheet";
import { parseCalories } from "../lib/store";
import { parseProtein } from "../lib/menu";
import CategoryIcon, { CATEGORIES } from "./CategoryIcon";

interface Props {
  open: boolean;
  trackProtein: boolean;
  /** Item being edited, or null when adding a new one. */
  item: MenuItem | null;
  onSave: (
    name: string,
    calories: number,
    protein: number | null,
    category: string | null,
  ) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function MenuItemSheet({
  open,
  trackProtein,
  item,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCalories(item ? String(item.calories) : "");
      setProtein(item?.protein != null ? String(item.protein) : "");
      setCategory(item?.category ?? null);
      setError(null);
    }
  }, [open, item]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the item a name.");
      return;
    }
    const cal = parseCalories(calories);
    if (cal === null) {
      setError("Calories must be a positive number up to 20,000.");
      return;
    }
    const prot = trackProtein ? parseProtein(protein) : item?.protein ?? null;
    if (prot === undefined) {
      setError("Protein must be between 0 and 1,000 grams (or left blank).");
      return;
    }
    onSave(trimmed, cal, prot, category);
    onClose();
  };

  return (
    <Sheet
      open={open}
      title={item ? "Edit item" : "New menu item"}
      onClose={onClose}
    >
      <p className="sheet-sub">
        {item
          ? "Tweak the details. Logged entries keep their values."
          : "Save a regular so it's one tap from now on."}
      </p>
      <form onSubmit={submit} noValidate>
        <div className="field sheet-name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={60}
            placeholder="Mini Cali Burrito"
            aria-label="Item name"
          />
        </div>
        <div className="sheet-fields">
          <div className="field field-cal">
            <input
              value={calories}
              onChange={(e) => {
                setCalories(e.target.value);
                setError(null);
              }}
              inputMode="numeric"
              placeholder="545"
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
        <div
          className="cat-grid"
          role="radiogroup"
          aria-label="Category (optional)"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={category === c.id}
              className={`cat-option${category === c.id ? " selected" : ""}`}
              onClick={() =>
                setCategory((prev) => (prev === c.id ? null : c.id))
              }
            >
              <CategoryIcon id={c.id} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <button type="submit" className="add-submit">
            {item ? "Save changes" : "Add to menu"}
          </button>
          {item && onDelete && (
            <button
              type="button"
              className="sheet-secondary"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              Remove from menu
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
