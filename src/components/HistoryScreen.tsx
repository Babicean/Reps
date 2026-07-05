import { useMemo, useRef, useState } from "react";
import type { Routine, Session, SetEntry } from "../types";
import type { WeekSummary } from "../lib/week";
import {
  formatDuration,
  formatNumber,
  formatSet,
  formatShortDay,
  formatWeekLabel,
} from "../lib/format";
import {
  groupByExercise,
  setsForSession,
  volumeOf,
} from "../lib/workout";
import { buildBackup, backupFilename, parseBackup } from "../lib/backup";
import type { BackupPayload, MergeResult } from "../lib/backup";
import { shareBackupFile } from "../lib/exportFile";
import type { Settings } from "../lib/settings";
import { useToast } from "../hooks/useToast";
import Sheet from "./Sheet";
import Toast from "./Toast";

interface Props {
  sessions: Session[];
  sets: SetEntry[];
  routines: Routine[];
  weeks: WeekSummary[];
  settings: Settings;
  onImport: (backup: BackupPayload) => MergeResult;
  onDeleteSession: (id: string) => void;
}

/** Sessions instead of days: every gym visit, structured and instant. */
export default function HistoryScreen({
  sessions,
  sets,
  routines,
  weeks,
  settings,
  onImport,
  onDeleteSession,
}: Props) {
  const { toast, showToast } = useToast();
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const maxVolume = Math.max(1, ...weeks.map((w) => w.volume));
  const openSets = useMemo(
    () => (openSession ? setsForSession(sets, openSession.id) : []),
    [sets, openSession],
  );

  const exportBackup = async () => {
    const json = buildBackup(sessions, sets, routines, settings);
    await shareBackupFile(backupFilename(), json);
  };

  const importFile = async (file: File) => {
    const backup = parseBackup(await file.text());
    if (!backup) {
      showToast(
        { kind: "confirm", message: "That doesn't look like a Reps backup" },
        2600,
      );
      return;
    }
    const result = onImport(backup);
    showToast(
      {
        kind: "confirm",
        message:
          result.addedSets > 0 || result.addedSessions > 0
            ? `Imported ${result.addedSessions} workouts, ${result.addedSets} sets`
            : "Nothing new to import",
      },
      2600,
    );
  };

  return (
    <div className="screen">
      <h1 className="history-title">History</h1>

      <div className="card trend-card">
        <div className="trend-head">
          <span className="trend-label">Last 8 weeks</span>
          <span className="trend-avg">
            {formatNumber(
              weeks.reduce((s, w) => s + w.sessionCount, 0),
            )}
            <span className="unit">workouts</span>
          </span>
        </div>
        <p className="trend-avg-caption">volume per week, kg</p>
        <svg
          className="trend-chart"
          viewBox="0 0 320 96"
          role="img"
          aria-label="Weekly training volume"
        >
          {weeks.map((w, i) => {
            const slot = 320 / weeks.length;
            const width = 22;
            const x = i * slot + (slot - width) / 2;
            const h =
              w.volume > 0 ? Math.max(4, (w.volume / maxVolume) * 64) : 0;
            const y = 78 - h;
            return (
              <g key={w.week}>
                {w.volume > 0 ? (
                  <rect
                    className={`bar${i === weeks.length - 1 ? "" : " dim"}`}
                    x={x}
                    y={y}
                    width={width}
                    height={h}
                    rx="4"
                  />
                ) : (
                  <rect
                    className="stub"
                    x={x}
                    y={74}
                    width={width}
                    height={4}
                    rx="2"
                  />
                )}
                <text className="axis-label" x={x + width / 2} y={92}>
                  {i === weeks.length - 1 ? "now" : formatWeekLabel(w.week)}
                </text>
              </g>
            );
          })}
          <line className="baseline" x1="0" y1="78.5" x2="320" y2="78.5" />
        </svg>
        <div className="trend-stats">
          <div className="tstat">
            <span className="tstat-v">{formatNumber(sessions.length)}</span>
            <span className="tstat-l">workouts, all time</span>
          </div>
          <div className="tstat">
            <span className="tstat-v">{formatNumber(sets.length)}</span>
            <span className="tstat-l">sets</span>
          </div>
          <div className="tstat">
            <span className="tstat-v">
              {formatNumber(volumeOf(sets))}
              <span className="u"> kg</span>
            </span>
            <span className="tstat-l">lifted</span>
          </div>
        </div>
      </div>

      <h2 className="section-label">
        All workouts
        {sessions.length > 0 && <span className="count">{sessions.length}</span>}
      </h2>

      {sessions.length === 0 ? (
        <div className="card empty history-empty">
          <p className="empty-title">No workouts yet</p>
          <p className="empty-sub">
            Finish your first session and it lands here — every set, kept
            for good.
          </p>
        </div>
      ) : (
        <div className="card menu-list">
          {sessions.map((session) => {
            const own = setsForSession(sets, session.id);
            return (
              <div key={session.id} className="menu-row">
                <button
                  className="menu-main"
                  onClick={() => {
                    setOpenSession(session);
                    setConfirmDelete(false);
                  }}
                  aria-label={`View ${session.routineName} on ${session.day}`}
                >
                  <span className="menu-text">
                    <span className="menu-name">
                      {session.routineName} · {formatShortDay(session.day)}
                    </span>
                    <span className="menu-detail">
                      {own.length} sets · {formatNumber(volumeOf(own))} kg
                      {session.endedAt !== null &&
                        ` · ${formatDuration(session.endedAt - session.startedAt)}`}
                    </span>
                  </span>
                  <span className="chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="section-label">Your data</h2>
      <div className="card data-card">
        <p className="data-sub">
          Everything stays on this device. Export a backup now and then,
          especially before switching phones.
        </p>
        <div className="data-actions">
          <button className="data-btn primary" onClick={exportBackup}>
            Export backup
          </button>
          <button
            className="data-btn"
            onClick={() => fileRef.current?.click()}
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Sheet
        open={openSession !== null}
        title={openSession?.routineName ?? ""}
        onClose={() => setOpenSession(null)}
      >
        {openSession && (
          <>
            <p className="sheet-sub">
              {formatShortDay(openSession.day)} · {openSets.length} sets ·{" "}
              {formatNumber(volumeOf(openSets))} kg
              {openSession.endedAt !== null &&
                ` · ${formatDuration(openSession.endedAt - openSession.startedAt)}`}
            </p>
            <div className="session-groups">
              {groupByExercise(openSets).map((group) => (
                <div key={group.exercise} className="session-group">
                  <span className="menu-name">{group.exercise}</span>
                  <span className="menu-detail">
                    {group.sets
                      .map((s) => formatSet(s.weight, s.reps))
                      .join(", ")}
                  </span>
                </div>
              ))}
            </div>
            <div className="sheet-actions">
              <button
                type="button"
                className="sheet-secondary"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  onDeleteSession(openSession.id);
                  setOpenSession(null);
                }}
              >
                {confirmDelete
                  ? "Tap again to delete this workout"
                  : "Delete workout"}
              </button>
            </div>
          </>
        )}
      </Sheet>
      <Toast toast={toast} />
    </div>
  );
}
