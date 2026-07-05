import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const CLOSE_MS = 200;
/** Drag past this many pixels (or flick faster than FLICK) to dismiss. */
const DISMISS_PX = 96;
/** Downward velocity in px/ms that counts as a dismissing flick. */
const FLICK = 0.55;

/** Diminishing resistance for upward pulls — the sheet feels attached. */
function rubberBand(dy: number): number {
  return 44 * (1 - 1 / (dy / 60 + 1));
}

/**
 * A modal sheet: slides up from the bottom on phones, appears as a centered
 * card on wider screens. Closes on backdrop tap, Escape, or dragging the
 * grabber down; pulling up stretches with rubber-band resistance.
 */
export default function Sheet({ open, title, onClose, children }: Props) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragged, setDragged] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startY: 0, lastY: 0, lastT: 0, velocity: 0 });

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      setDragY(0);
      setDragging(false);
      setDragged(false);
    } else if (render) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setRender(false);
        setClosing(false);
      }, CLOSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, render]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet so keyboard users land in the right place.
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input, button",
    );
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || closing) return;
    drag.current = {
      startY: e.clientY,
      lastY: e.clientY,
      lastT: e.timeStamp,
      velocity: 0,
    };
    setDragging(true);
    setDragged(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !e.isPrimary) return;
    const dt = e.timeStamp - drag.current.lastT;
    if (dt > 0) {
      drag.current.velocity = (e.clientY - drag.current.lastY) / dt;
    }
    drag.current.lastY = e.clientY;
    drag.current.lastT = e.timeStamp;
    const dy = e.clientY - drag.current.startY;
    setDragY(dy >= 0 ? dy : -rubberBand(-dy));
  };

  const onHandleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    // A pause before letting go means it's a hold, not a flick.
    const stale = e.timeStamp - drag.current.lastT > 120;
    const flung = !stale && dragY > 20 && drag.current.velocity > FLICK;
    if (dragY > DISMISS_PX || flung) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!render) return null;

  const panelStyle = {
    // While closing, the keyframe takes over from wherever the drag ended.
    transform:
      !closing && dragY !== 0 ? `translateY(${dragY}px)` : undefined,
    "--drag-y": `${Math.max(0, dragY)}px`,
  } as CSSProperties;

  // Portal to <body>: the screen's entrance animation creates a stacking
  // context that would otherwise trap the sheet underneath the tab bar.
  return createPortal(
    <div
      className={`sheet-backdrop${closing ? " closing" : ""}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={`sheet${closing ? " closing" : ""}${
          dragged ? " dragged" : ""
        }${dragging ? " dragging" : ""}`}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <div className="sheet-grabber" aria-hidden="true" />
          <h2 className="sheet-title">{title}</h2>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
