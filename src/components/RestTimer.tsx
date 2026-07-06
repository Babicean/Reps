import { useEffect, useState } from "react";
import { haptic } from "../lib/fly";

interface Props {
  /** Timestamp the rest started (last set, or a manual restart). */
  since: number | null;
  /** Tap handler: the parent moves the baseline to "now". */
  onReset: () => void;
}

/**
 * The rest stopwatch: counts up from the last logged set, no
 * configuration, no alarms. Restarts itself every time a set lands;
 * disappears when there's nothing to rest from (or the "rest" has
 * clearly become lunch). Tapping it restarts the count from zero —
 * that's the whole control surface.
 */
export default function RestTimer({ since, onReset }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (since === null) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [since]);

  if (since === null) return null;
  const seconds = Math.floor((Date.now() - since) / 1000);
  if (seconds < 1 || seconds > 30 * 60) return null;
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");

  return (
    <button
      type="button"
      className="rest-pill"
      role="timer"
      aria-label="Rest time — tap to restart"
      onClick={() => {
        onReset();
        haptic(8);
      }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M7 5.5V8l1.8 1.2M5.5 1.5h3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      rest {m}:{s}
    </button>
  );
}
