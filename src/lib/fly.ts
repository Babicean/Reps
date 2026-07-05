/**
 * Micro-interaction: a small "+540" pill detaches from the tapped control
 * and arcs up into the running total — a lob, not a slide. Pure DOM so any
 * component can trigger it.
 */

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function flyValue(text: string, fromEl: HTMLElement | null): void {
  const target = document.getElementById("hero-total");
  if (!fromEl || !target) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const from = fromEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;

  const chip = document.createElement("span");
  chip.className = "fly-cal";
  chip.textContent = text;
  chip.style.left = `${sx}px`;
  chip.style.top = `${sy}px`;
  document.body.appendChild(chip);

  // Quadratic bezier control point: above both ends, leaning toward the
  // start, so the pill lobs upward before settling into the number.
  const arc = 56 + Math.min(110, Math.abs(ty - sy) * 0.28);
  const cx = sx + (tx - sx) * 0.24;
  const cy = Math.min(sy, ty) - arc;
  const at = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * tx,
      y: u * u * sy + 2 * u * t * cy + t * t * ty,
    };
  };

  // Bake the curve into evenly-timed keyframes with eased progress.
  const STEPS = 22;
  const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    const p = at(easeInOutCubic(t));
    // Pop out, cruise, then shrink into the total.
    const scale =
      t < 0.16
        ? 0.5 + (t / 0.16) * 0.58 // 0.5 → 1.08
        : t < 0.72
          ? 1.08 - ((t - 0.16) / 0.56) * 0.12 // → 0.96
          : 0.96 - ((t - 0.72) / 0.28) * 0.52; // → 0.44
    const opacity = t < 0.06 ? t / 0.06 : t > 0.84 ? (1 - t) / 0.16 : 1;
    const rotate = -5 + t * 8;
    return {
      transform: `translate(${p.x - sx}px, ${p.y - sy}px) translate(-50%, -50%) scale(${scale.toFixed(3)}) rotate(${rotate.toFixed(1)}deg)`,
      opacity,
    };
  });

  const animation = chip.animate(frames, {
    duration: 720,
    easing: "linear", // easing is baked into the sampled frames
  });
  animation.onfinish = () => chip.remove();
}

/** A tiny haptic tick on devices that support it. */
export function haptic(ms = 10): void {
  navigator.vibrate?.(ms);
}
