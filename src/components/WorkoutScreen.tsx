import { useCallback, useEffect, useMemo, useState } from "react";
import type { Routine, Session, SetEntry } from "../types";
import {
  formatDuration,
  formatHeroDate,
  formatNumber,
  formatSet,
  formatTime,
} from "../lib/format";
import { trackingDayFor } from "../lib/day";
import { flyValue, haptic } from "../lib/fly";
import { celebrate } from "../lib/burst";
import { useToast } from "../hooks/useToast";
import {
  groupByExercise,
  isPersonalRecord,
  lastTimeFor,
} from "../lib/workout";
import AnimatedNumber from "./AnimatedNumber";
import ExerciseSheet from "./ExerciseSheet";
import RestTimer from "./RestTimer";
import Toast from "./Toast";

interface Props {
  routines: Routine[];
  sessions: Session[];
  sets: SetEntry[];
  activeSession: Session | null;
  activeSets: SetEntry[];
  activeVolume: number;
  suggested: Routine | null;
  weekCount: number;
  weeklyTarget: number | null;
  streak: number;
  onStart: (routine: Routine | null) => void;
  onFinish: (id: string) => void;
  onDiscard: (id: string) => void;
  onLogSet: (
    sessionId: string,
    exercise: string,
    weight: number | null,
    reps: number,
  ) => SetEntry;
  onDeleteSet: (id: string) => SetEntry | null;
  onRestoreSet: (entry: SetEntry) => void;
}

export default function WorkoutScreen(props: Props) {
  const {
    routines,
    sessions,
    sets,
    activeSession,
    activeSets,
    activeVolume,
    suggested,
    weekCount,
    weeklyTarget,
    streak,
    onStart,
    onFinish,
    onDiscard,
    onLogSet,
    onDeleteSet,
    onRestoreSet,
  } = props;
  const { toast, showToast, showConfirmation, dismiss } = useToast();
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  // Tick the session duration display once a minute while live.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!activeSession) return;
    const timer = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    setConfirmFinish(false);
  }, [activeSession?.id]);

  const routine = useMemo(
    () =>
      activeSession
        ? (routines.find((r) => r.id === activeSession.routineId) ?? null)
        : null,
    [routines, activeSession],
  );

  /** The live checklist: routine slots first, then anything logged ad hoc. */
  const checklist = useMemo(() => {
    if (!activeSession) return [];
    const groups = groupByExercise(activeSets);
    const items: {
      name: string;
      logged: SetEntry[];
      target: number | null;
    }[] = [];
    for (const slot of routine?.exercises ?? []) {
      const group = groups.find(
        (g) => g.exercise.toLowerCase() === slot.name.toLowerCase(),
      );
      items.push({
        name: slot.name,
        logged: group?.sets ?? [],
        target: slot.targetSets,
      });
    }
    for (const group of groups) {
      if (
        !items.some((i) => i.name.toLowerCase() === group.exercise.toLowerCase())
      ) {
        items.push({ name: group.exercise, logged: group.sets, target: null });
      }
    }
    return items;
  }, [activeSession, activeSets, routine]);

  const handleLog = useCallback(
    (exercise: string, weight: number | null, reps: number, el: HTMLElement) => {
      if (!activeSession) return;
      const pr = isPersonalRecord(exercise, weight, sets);
      onLogSet(activeSession.id, exercise, weight, reps);
      if (weight !== null) {
        flyValue(`+${formatNumber(weight * reps)}`, el);
      }
      if (pr) {
        window.setTimeout(() => {
          celebrate(document.getElementById("hero-total"));
          haptic(24);
          showToast(
            { kind: "streak", message: `PR — ${exercise} ${formatSet(weight, reps)}` },
            2800,
          );
        }, 350);
        haptic(10);
      } else {
        haptic(10);
        showConfirmation();
      }
    },
    [activeSession, sets, onLogSet, showToast, showConfirmation],
  );

  const handleDeleteSet = useCallback(
    (id: string) => {
      const removed = onDeleteSet(id);
      haptic(8);
      if (removed) {
        showToast(
          {
            kind: "undo",
            message: "Set deleted",
            action: {
              label: "Undo",
              onPress: () => {
                onRestoreSet(removed);
                haptic(10);
                dismiss();
              },
            },
          },
          5000,
        );
      }
    },
    [onDeleteSet, onRestoreSet, showToast, dismiss],
  );

  const finish = () => {
    if (!activeSession) return;
    if (activeSets.length === 0) {
      // Nothing logged: discard instead of writing an empty husk.
      onDiscard(activeSession.id);
      haptic(8);
      return;
    }
    if (!confirmFinish) {
      setConfirmFinish(true);
      return;
    }
    const hitTarget =
      weeklyTarget !== null && weekCount + 1 === weeklyTarget;
    onFinish(activeSession.id);
    haptic(16);
    if (hitTarget) {
      window.setTimeout(() => {
        celebrate(document.getElementById("idle-hero"));
        showToast(
          { kind: "streak", message: `That's ${weeklyTarget} this week` },
          2800,
        );
      }, 400);
    }
  };

  /* ---- idle: start a workout -------------------------------------------- */

  if (!activeSession) {
    const others = routines.filter((r) => r.id !== suggested?.id);
    return (
      <div className="screen">
        <div className="hero" id="idle-hero">
          <p className="hero-date">
            {formatHeroDate(trackingDayFor(new Date()))}
          </p>
          {streak > 0 && weeklyTarget !== null && (
            <span className="streak-line">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M6 0l1.4 4.6L12 6l-4.6 1.4L6 12 4.6 7.4 0 6l4.6-1.4L6 0z"
                  fill="currentColor"
                />
              </svg>
              {streak === 1 ? "1 week on target" : `${streak} weeks on target`}
            </span>
          )}
        </div>

        {suggested ? (
          <button
            className="card start-card"
            onClick={() => {
              haptic(10);
              onStart(suggested);
            }}
          >
            <span className="start-kicker">Up next</span>
            <span className="start-name">{suggested.name}</span>
            <span className="start-sub">
              {suggested.exercises.length} exercises
            </span>
            <span className="start-go">Start workout</span>
          </button>
        ) : (
          <div className="card empty history-empty">
            <p className="empty-title">No routines yet</p>
            <p className="empty-sub">
              Build your first routine in the Routines tab, then start it
              from here.
            </p>
          </div>
        )}

        {(others.length > 0 || suggested) && (
          <div className="chips start-alts" role="list" aria-label="Other workouts">
            {others.map((r) => (
              <button
                key={r.id}
                role="listitem"
                className="chip"
                onClick={() => {
                  haptic(10);
                  onStart(r);
                }}
              >
                <span className="chip-plus" aria-hidden="true">
                  +
                </span>
                {r.name}
              </button>
            ))}
            <button
              role="listitem"
              className="chip"
              onClick={() => {
                haptic(10);
                onStart(null);
              }}
            >
              <span className="chip-plus" aria-hidden="true">
                +
              </span>
              Blank workout
            </button>
          </div>
        )}

        {weeklyTarget !== null && (
          <>
            <h2 className="section-label">This week</h2>
            <div className="card week-card">
              <div className="week-dots" aria-hidden="true">
                {Array.from({ length: Math.max(weeklyTarget, weekCount) }).map(
                  (_, i) => (
                    <span
                      key={i}
                      className={`week-dot${i < weekCount ? " done" : ""}`}
                    />
                  ),
                )}
              </div>
              <p className="week-line">
                {weekCount} of {weeklyTarget} session
                {weeklyTarget === 1 ? "" : "s"}
                {weekCount >= weeklyTarget ? " — target met" : ""}
              </p>
            </div>
          </>
        )}
        <Toast toast={toast} />
      </div>
    );
  }

  /* ---- active: the live session ------------------------------------------ */

  const duration = Date.now() - activeSession.startedAt;
  const openItem = checklist.find((i) => i.name === openExercise) ?? null;
  const lastSetAt =
    activeSets.length > 0
      ? Math.max(...activeSets.map((s) => s.timestamp))
      : null;

  return (
    <div className="screen">
      <div className="hero hero-live">
        <p className="hero-date">
          {activeSession.routineName} · started{" "}
          {formatTime(activeSession.startedAt)}
        </p>
        <div className="hero-total" id="hero-total">
          <AnimatedNumber value={activeVolume} />
        </div>
        <p className="hero-caption">kg lifted</p>
        <p className="hero-protein">
          {activeSets.length} set{activeSets.length === 1 ? "" : "s"} ·{" "}
          {formatDuration(duration)}
        </p>
        <div className="hero-rest">
          <RestTimer since={lastSetAt} />
        </div>
      </div>

      <div className="card menu-list">
        {checklist.map((item) => {
          const done =
            item.target !== null && item.logged.length >= item.target;
          return (
            <div key={item.name} className="menu-row">
              <button
                className="menu-main"
                onClick={() => setOpenExercise(item.name)}
                aria-label={`Log sets for ${item.name}`}
              >
                <span
                  className={`menu-tile ex-tile${done ? " done" : ""}`}
                  aria-hidden="true"
                >
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.5 7.5l3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="ex-count">
                      {item.logged.length}
                      {item.target !== null && `/${item.target}`}
                    </span>
                  )}
                </span>
                <span className="menu-text">
                  <span className="menu-name">{item.name}</span>
                  <span className="menu-detail">
                    {item.logged.length === 0
                      ? item.target !== null
                        ? `${item.target} sets`
                        : "extra"
                      : item.logged
                          .map((s) => formatSet(s.weight, s.reps))
                          .join(", ")}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
        <div className="menu-row">
          <button
            className="menu-main ex-add"
            onClick={() => setCustomOpen(true)}
          >
            <span className="menu-tile" aria-hidden="true">
              +
            </span>
            <span className="menu-text">
              <span className="menu-name">Another exercise</span>
              <span className="menu-detail">Anything off-plan</span>
            </span>
          </button>
        </div>
      </div>

      <div className="sheet-actions finish-wrap">
        <button type="button" className="add-submit" onClick={finish}>
          {activeSets.length === 0
            ? "Discard workout"
            : confirmFinish
              ? "Tap again to finish"
              : "Finish workout"}
        </button>
        {confirmFinish && (
          <button
            type="button"
            className="sheet-secondary quiet"
            onClick={() => setConfirmFinish(false)}
          >
            Keep going
          </button>
        )}
      </div>

      <ExerciseSheet
        open={openItem !== null}
        exercise={openItem?.name ?? ""}
        editableName={false}
        lastTime={
          openItem
            ? lastTimeFor(
                openItem.name,
                sets,
                sessions,
                routines,
                activeSession.id,
              )
            : null
        }
        todaySets={openItem?.logged ?? []}
        restSince={lastSetAt}
        onLog={handleLog}
        onDeleteSet={handleDeleteSet}
        onClose={() => setOpenExercise(null)}
      />
      <ExerciseSheet
        open={customOpen}
        exercise=""
        editableName={true}
        lastTime={null}
        todaySets={[]}
        restSince={lastSetAt}
        onLog={(name, weight, reps, el) => {
          handleLog(name, weight, reps, el);
          setCustomOpen(false);
          setOpenExercise(name);
        }}
        onDeleteSet={handleDeleteSet}
        onClose={() => setCustomOpen(false)}
      />
      <Toast toast={toast} />
    </div>
  );
}
