import { useCallback, useRef, useState } from "react";
import type { ToastData } from "../components/Toast";

// Rotating confirmation copy — short, warm, never a lecture.
const CONFIRMATIONS = ["Logged", "Counted", "On the reps", "Noted"];

/** Per-screen toast state: one visible pill, auto-dismissed. */
export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef(0);
  const id = useRef(0);

  const showToast = useCallback(
    (data: Omit<ToastData, "id">, duration: number) => {
      window.clearTimeout(timer.current);
      id.current += 1;
      setToast({ ...data, id: id.current });
      timer.current = window.setTimeout(() => setToast(null), duration);
    },
    [],
  );

  const showConfirmation = useCallback(() => {
    showToast(
      {
        kind: "confirm",
        message:
          CONFIRMATIONS[Math.floor(Math.random() * CONFIRMATIONS.length)],
      },
      1600,
    );
  }, [showToast]);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, showToast, showConfirmation, dismiss };
}
