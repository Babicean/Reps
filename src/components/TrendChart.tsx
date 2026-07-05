import { useState } from "react";
import type { DayKey } from "../types";
import { formatCalories, weekdayInitial } from "../lib/format";

export interface TrendPoint {
  day: DayKey;
  total: number;
}

interface Props {
  /** Exactly the last 7 tracking days, oldest first. */
  points: TrendPoint[];
  average: number | null;
}

// Chart geometry (SVG user units).
const W = 320;
const H = 148;
const TOP = 26; // headroom for the hover value label
const BOTTOM = 22; // weekday axis row
const PLOT_H = H - TOP - BOTTOM;
const BAR_W = 26;
const RADIUS = 4;

/** Bar path anchored to the baseline with rounded top corners only. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, h / 2, w / 2);
  const baseY = TOP + PLOT_H;
  return [
    `M ${x} ${baseY}`,
    `V ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `H ${x + w - r}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `V ${baseY}`,
    "Z",
  ].join(" ");
}

/**
 * 7-day calorie trend. Single series, so today's bar carries full accent and
 * past days sit at reduced opacity; hovering (or tapping) a day shows its
 * exact value above the bar.
 */
export default function TrendChart({ points, average }: Props) {
  const [active, setActive] = useState<number | null>(null);

  const max = Math.max(...points.map((p) => p.total), average ?? 0, 1);
  const slot = W / points.length;
  const scale = (v: number) => (v / max) * PLOT_H;

  const label =
    active !== null && points[active].total > 0 ? points[active] : null;

  return (
    <svg
      className="trend-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Calories over the last 7 days: ${points
        .map((p) => `${weekdayInitial(p.day)} ${p.total}`)
        .join(", ")}`}
      onMouseLeave={() => setActive(null)}
    >
      {average !== null && average > 0 && (
        <line
          className="avg-line"
          x1={0}
          x2={W}
          y1={TOP + PLOT_H - scale(average)}
          y2={TOP + PLOT_H - scale(average)}
        />
      )}

      {points.map((p, i) => {
        const x = slot * i + (slot - BAR_W) / 2;
        const h = scale(p.total);
        const isToday = i === points.length - 1;
        return (
          <g key={p.day}>
            {p.total > 0 ? (
              <path
                className={`bar${
                  active === null
                    ? isToday
                      ? ""
                      : " dim"
                    : active === i
                      ? ""
                      : " dim"
                }`}
                d={barPath(x, TOP + PLOT_H - h, BAR_W, h)}
              />
            ) : (
              // Zero-calorie day: a small stub so the day still reads as present.
              <rect
                className="stub"
                x={x}
                y={TOP + PLOT_H - 3}
                width={BAR_W}
                height={3}
                rx={1.5}
              />
            )}
            <text
              className={`axis-label${isToday ? " today" : ""}`}
              x={slot * i + slot / 2}
              y={H - 6}
            >
              {weekdayInitial(p.day)}
            </text>
            {/* Full-column hover / tap target, larger than the mark itself. */}
            <rect
              className="bar-hit"
              x={slot * i}
              y={0}
              width={slot}
              height={H}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
            />
          </g>
        );
      })}

      <line
        className="baseline"
        x1={0}
        x2={W}
        y1={TOP + PLOT_H + 0.5}
        y2={TOP + PLOT_H + 0.5}
      />

      {label && (
        <text
          className="tip-value"
          x={Math.min(
            Math.max(slot * active! + slot / 2, 20),
            W - 20,
          )}
          y={Math.max(TOP + PLOT_H - scale(label.total) - 8, 12)}
        >
          {formatCalories(label.total)}
        </text>
      )}
    </svg>
  );
}
