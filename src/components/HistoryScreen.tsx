import { useMemo, useRef, useState } from "react";
import type { Routine, Session, SetEntry } from "../types";
import type { WeekSummary } from "../lib/week";
import {
  formatDuration,
  formatKg,
  formatNumber,
  formatSet,
  formatShortDay,
  formatWeekLabel,
} from "../lib/format";
import {
  exerciseTrend,
  groupByExercise,
  personalRecords,
  setsForSession,
  volumeOf,
} from "../lib/workout";
import { trackingDayFor } from "../lib/day";
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

/** Where in History we are: the list, the trophy case, or one exercise. */
type View =
  | { kind: "main" }
  | { kind: "trophies" }
  | { kind: "exercise"; name: string };

const TROPHY_ICON = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M6.5 3h7v5a3.5 3.5 0 01-7 0V3z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 4.5H3.75c.1 2.3 1.3 3.7 3 4M13.5 4.5h2.75c-.1 2.3-1.3 3.7-3 4M10 11.5V15M7.25 16.5h5.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const BACK_ICON = (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
    <path
      d="M8.5 1.5L2 8l6.5 6.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
  const [view, setView] = useState<View>({ kind: "main" });
  const fileRef = useRef<HTMLInputElement>(null);

  const go = (next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const records = useMemo(() => personalRecords(sets), [sets]);

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

  /* ---- trophy case ------------------------------------------------------ */

  if (view.kind === "trophies") {
    return (
      <div className="screen" key="trophies">
        <button className="drill-back" onClick={() => go({ kind: "main" })}>
          {BACK_ICON}
          <span>History</span>
        </button>
        <h1 className="history-title">Trophy case</h1>
        <p className="screen-sub">
          Your heaviest set of every exercise, all time. Only real logged
          sets count — program seeds never make the wall.
        </p>
        <div className="card menu-list">
          {records.map((r, i) => (
            <div key={r.exercise.toLowerCase()} className="menu-row">
              <button
                className="menu-main pr-main"
                onClick={() => go({ kind: "exercise", name: r.exercise })}
                aria-label={`${r.exercise} record and trend`}
              >
                <span className={`pr-medal${i === 0 ? " gold" : ""}`}>
                  {TROPHY_ICON}
                </span>
                <span className="menu-text">
                  <span className="menu-name">{r.exercise}</span>
                  <span className="menu-detail">
                    {formatSet(r.weight, r.reps)} ·{" "}
                    {formatShortDay(trackingDayFor(new Date(r.timestamp)))}
                  </span>
                </span>
                <span className="pr-value">
                  {r.weight !== null ? (
                    <>
                      {formatKg(r.weight)}
                      <span className="u"> kg</span>
                    </>
                  ) : (
                    <>×{r.reps}</>
                  )}
                </span>
                <span className="chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---- one exercise: record + trend --------------------------------------- */

  if (view.kind === "exercise") {
    const record = records.find(
      (r) => r.exercise.toLowerCase() === view.name.toLowerCase(),
    );
    const points = exerciseTrend(view.name, sets, sessions);
    const weighted = points.filter((p) => p.weight !== null);
    const series = weighted.length > 0 ? weighted : points;
    const byReps = weighted.length === 0;
    const values = series.map((p) => (byReps ? p.reps : (p.weight ?? 0)));
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const X0 = 10;
    const X1 = 310;
    const Y0 = 16;
    const Y1 = 84;
    const px = (i: number) =>
      series.length === 1 ? 160 : X0 + (i / (series.length - 1)) * (X1 - X0);
    const py = (v: number) => Y1 - ((v - lo) / span) * (Y1 - Y0);
    const fmt = (v: number) => (byReps ? `×${v}` : formatKg(v));
    // Label every dot while the chart is sparse; first/peak/last after.
    const peak = values.indexOf(hi);
    const labelled =
      series.length <= 8
        ? values.map((_, i) => i)
        : [0, peak, series.length - 1];

    return (
      <div className="screen" key={`ex-${view.name}`}>
        <button className="drill-back" onClick={() => go({ kind: "trophies" })}>
          {BACK_ICON}
          <span>Trophy case</span>
        </button>
        <h1 className="history-title">{view.name}</h1>
        <div className="card trend-card">
          <div className="trend-head">
            <span className="trend-label">
              {byReps ? "Top reps" : "Top set"} per workout
            </span>
          </div>
          <p className="trend-avg-caption">
            {byReps ? "bodyweight — reps of the best set" : "kg, best set of the day"}
          </p>
          <svg
            className="trend-chart exline-chart"
            viewBox="0 0 320 100"
            role="img"
            aria-label={`${view.name} best set over time`}
          >
            {series.length > 1 && (
              <polyline
                className="exline"
                points={series
                  .map((_, i) => `${px(i)},${py(values[i])}`)
                  .join(" ")}
              />
            )}
            {series.map((p, i) => (
              <g key={p.startedAt}>
                <circle
                  className={`exdot${i === series.length - 1 ? " now" : ""}`}
                  cx={px(i)}
                  cy={py(values[i])}
                  r={i === series.length - 1 ? 4 : 3}
                />
                {labelled.includes(i) && (
                  <text
                    className="axis-label exval"
                    x={px(i)}
                    y={py(values[i]) - 8}
                  >
                    {fmt(values[i])}
                  </text>
                )}
              </g>
            ))}
            <text className="axis-label" x={X0} y={97} textAnchor="start">
              {formatShortDay(series[0].day)}
            </text>
            {series.length > 1 && (
              <text className="axis-label" x={X1} y={97} textAnchor="end">
                {formatShortDay(series[series.length - 1].day)}
              </text>
            )}
          </svg>
          <div className="trend-stats">
            <div className="tstat">
              <span className="tstat-v">
                {record?.weight != null ? (
                  <>
                    {formatKg(record.weight)}
                    <span className="u"> kg</span>
                  </>
                ) : (
                  <>×{record?.reps ?? 0}</>
                )}
              </span>
              <span className="tstat-l">best set</span>
            </div>
            <div className="tstat">
              <span className="tstat-v">{formatNumber(points.length)}</span>
              <span className="tstat-l">workouts</span>
            </div>
            <div className="tstat">
              <span className="tstat-v">
                {formatNumber(record?.volume ?? 0)}
                <span className="u"> kg</span>
              </span>
              <span className="tstat-l">lifted</span>
            </div>
          </div>
        </div>

        <h2 className="section-label">Recent</h2>
        <div className="card menu-list">
          {[...points].reverse().slice(0, 6).map((p) => (
            <div key={p.startedAt} className="menu-row">
              <span className="menu-main pr-recent">
                <span className="menu-text">
                  <span className="menu-name">{formatShortDay(p.day)}</span>
                  <span className="menu-detail">
                    top set {formatSet(p.weight, p.reps)}
                    {p.volume > 0 && ` · ${formatNumber(p.volume)} kg`}
                  </span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {records.length > 0 && (
        <button className="card pr-row" onClick={() => go({ kind: "trophies" })}>
          <span className="pr-medal gold">{TROPHY_ICON}</span>
          <span className="menu-text">
            <span className="menu-name">Trophy case</span>
            <span className="menu-detail">
              {records.length} personal record{records.length === 1 ? "" : "s"}
            </span>
          </span>
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </button>
      )}

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
