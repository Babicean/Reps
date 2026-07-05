import { useEffect, useRef, useState } from "react";
import type { DayKey } from "../types";
import type { Streak } from "../lib/streak";
import { formatCalories, formatHeroDate } from "../lib/format";
import AnimatedNumber from "./AnimatedNumber";

interface Props {
  today: DayKey;
  total: number;
  /** Grams of protein logged today; hidden when zero or tracking is off. */
  protein: number;
  trackProtein: boolean;
  proteinTarget: number | null;
  streak: Streak;
  goal: number | null;
  onEditGoal: () => void;
}

// Ring geometry (SVG user units).
const SIZE = 240;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Ambient sparkles: deterministic positions (golden-angle scatter inside the
 * ring) so existing sparkles never move — progress just reveals more of them.
 */
const SPARK_COLORS = ["var(--accent)", "var(--warn)", "var(--ink-3)"];
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = i * 137.508 * (Math.PI / 180);
  const radius = 64 + ((i * 31) % 40);
  return {
    x: SIZE / 2 + Math.cos(angle) * radius,
    y: SIZE / 2 + Math.sin(angle) * radius,
    size: 1.6 + ((i * 13) % 10) / 6,
    star: i % 3 === 0, // every third is a tiny 4-point spark
    color: SPARK_COLORS[i % SPARK_COLORS.length],
    delay: (i % 7) * 0.55,
    duration: 2.6 + (i % 4) * 0.7,
  };
});

/** A tiny 4-point star path centred on (0,0). */
function starPath(r: number): string {
  const inner = r * 0.38;
  return `M0 ${-r} L${inner} ${-inner} L${r} 0 L${inner} ${inner} L0 ${r} L${-inner} ${inner} L${-r} 0 L${-inner} ${-inner} Z`;
}

/**
 * The hero total. Without a goal it's the big free-standing number; with a
 * goal it sits inside a progress ring that fills toward the target and shifts
 * to a calm amber once the target is passed.
 */
export default function Hero({
  today,
  total,
  protein,
  trackProtein,
  proteinTarget,
  streak,
  goal,
  onEditGoal,
}: Props) {
  const [pulsing, setPulsing] = useState(false);
  const prevTotal = useRef(total);
  useEffect(() => {
    if (prevTotal.current !== total) {
      prevTotal.current = total;
      setPulsing(true);
      const t = window.setTimeout(() => setPulsing(false), 500);
      return () => window.clearTimeout(t);
    }
  }, [total]);

  // Let the ring animate from empty on first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const proteinLine =
    trackProtein && (protein > 0 || proteinTarget !== null) ? (
      <div className="hero-protein-wrap">
        <p
          className={`hero-protein${
            proteinTarget !== null && protein >= proteinTarget ? " met" : ""
          }`}
        >
          {formatCalories(protein)}
          {proteinTarget !== null && ` / ${formatCalories(proteinTarget)}`} g
          protein
        </p>
        {proteinTarget !== null && (
          <div
            className="protein-bar"
            role="img"
            aria-label={`${protein} of ${proteinTarget} grams of protein`}
          >
            <div
              className="protein-bar-fill"
              style={{
                width: `${
                  (mounted ? Math.min(protein / proteinTarget, 1) : 0) * 100
                }%`,
              }}
            />
          </div>
        )}
      </div>
    ) : null;

  if (goal === null) {
    return (
      <header className="hero">
        <p className="hero-date">{formatHeroDate(today)}</p>
        {streak.length >= 2 && (
          <p className="streak-line">
            <svg width="11" height="11" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">
              <path d="M7.5 0.8l1.7 4.9 4.9 1.8-4.9 1.8-1.7 4.9-1.7-4.9L.9 7.5l4.9-1.8L7.5.8z" />
            </svg>
            {streak.length}-day streak
          </p>
        )}
        <h1 id="hero-total" className={`hero-total${pulsing ? " pulse" : ""}`}>
          <AnimatedNumber value={total} />
        </h1>
        <p className="hero-caption">calories today</p>
        {proteinLine}
        <button className="goal-pill ghost" onClick={onEditGoal}>
          Set a calorie target
        </button>
      </header>
    );
  }

  const progress = Math.min(total / goal, 1);
  const over = total > goal;
  const offset = CIRCUMFERENCE * (1 - (mounted ? progress : 0));

  return (
    <header className="hero hero-ring">
      <p className="hero-date">{formatHeroDate(today)}</p>
      {streak.length >= 2 && (
        <p className="streak-line">
          <svg width="11" height="11" viewBox="0 0 15 15" fill="currentColor" aria-hidden="true">
            <path d="M7.5 0.8l1.7 4.9 4.9 1.8-4.9 1.8-1.7 4.9-1.7-4.9L.9 7.5l4.9-1.8L7.5.8z" />
          </svg>
          {streak.length}-day streak
        </p>
      )}
      <div className="ring">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${total} of ${goal} calories`}
        >
          {/* Sparkles accumulate with progress; each keeps its spot. */}
          <g className="sparkles">
            {SPARKS.slice(
              0,
              Math.min(SPARKS.length, Math.floor(progress * SPARKS.length)),
            ).map((sp, i) => (
              <g
                key={i}
                className="sparkle"
                style={
                  {
                    "--tw-delay": `${sp.delay}s`,
                    "--tw-dur": `${sp.duration}s`,
                  } as React.CSSProperties
                }
                transform={`translate(${sp.x} ${sp.y})`}
                fill={sp.color}
              >
                {sp.star ? (
                  <path d={starPath(sp.size * 1.9)} />
                ) : (
                  <circle r={sp.size} />
                )}
              </g>
            ))}
          </g>
          <circle
            className="ring-track"
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            strokeWidth={STROKE}
          />
          <circle
            className={`ring-progress${over ? " over" : ""}`}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="ring-inner">
          <h1
            id="hero-total"
            className={`ring-total${pulsing ? " pulse" : ""}`}
          >
            <AnimatedNumber value={total} />
          </h1>
          <p className="ring-caption">of {formatCalories(goal)} cal</p>
        </div>
      </div>
      {proteinLine}
      <button
        className={`goal-pill${over ? " over" : ""}`}
        onClick={onEditGoal}
      >
        <AnimatedNumber value={over ? total - goal : goal - total} />
        {over ? " over goal" : " remaining"}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M3.5 2l3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </header>
  );
}
