import { useMemo, useState } from "react";
import type { DayKey, DaySummary, Entry, MenuItem } from "../types";
import { addDays } from "../lib/day";
import { formatCalories, formatDayLabel, formatTime } from "../lib/format";
import type { BackupPayload, MergeResult } from "../lib/backup";
import { weeklyStats } from "../lib/stats";
import TrendChart, { TrendPoint } from "./TrendChart";
import DataCard from "./DataCard";
import BackdateSheet from "./BackdateSheet";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";

interface Props {
  today: DayKey;
  history: DaySummary[];
  entries: Entry[];
  menu: MenuItem[];
  trackProtein: boolean;
  onImport: (backup: BackupPayload) => MergeResult;
  onAddBackdated: (
    calories: number,
    description: string,
    protein: number | null,
    when: Date,
  ) => void;
}

export default function HistoryScreen({
  today,
  history,
  entries,
  menu,
  trackProtein,
  onImport,
  onAddBackdated,
}: Props) {
  const [openDay, setOpenDay] = useState<DayKey | null>(null);
  const [backdating, setBackdating] = useState<DayKey | null>(null);
  const { toast, showToast } = useToast();

  const { points, average, stats } = useMemo(() => {
    const totals = new Map(history.map((s) => [s.day, s.total]));
    const pts: TrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = addDays(today, -i);
      pts.push({ day, total: totals.get(day) ?? 0 });
    }
    const weekly = weeklyStats(entries, today);
    return { points: pts, average: weekly.avg, stats: weekly };
  }, [history, entries, today]);

  return (
    <div className="screen">
      <h1 className="history-title">History</h1>

      {history.length > 0 && (
        <section className="card trend-card">
          <div className="trend-head">
            <p className="trend-label">Last 7 days</p>
          </div>
          {average !== null ? (
            <>
              <p className="trend-avg">
                {formatCalories(average)}
                <span className="unit">cal</span>
              </p>
              <p className="trend-avg-caption">daily average</p>
            </>
          ) : (
            <p className="trend-avg-caption">No entries in the last 7 days.</p>
          )}
          <TrendChart points={points} average={average} />
          {stats.daysLogged > 0 && (
            <div className="trend-stats">
              <div className="tstat">
                <span className="tstat-v">
                  {stats.daysLogged}
                  <span className="u">/7</span>
                </span>
                <span className="tstat-l">days logged</span>
              </div>
              {stats.deltaPct !== null && (
                <div className="tstat">
                  <span className="tstat-v">
                    {stats.deltaPct > 0 ? "+" : ""}
                    {stats.deltaPct}
                    <span className="u">%</span>
                  </span>
                  <span className="tstat-l">vs last week</span>
                </div>
              )}
              {trackProtein && stats.proteinAvg !== null && (
                <div className="tstat">
                  <span className="tstat-v">
                    {stats.proteinAvg}
                    <span className="u"> g</span>
                  </span>
                  <span className="tstat-l">protein / day</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {history.length > 0 && <h2 className="section-label">All days</h2>}
      {history.length === 0 ? (
        <div className="card empty history-empty">
          <svg
            className="empty-icon"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="10"
              y="26"
              width="7"
              height="16"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.5"
            />
            <rect
              x="22.5"
              y="18"
              width="7"
              height="24"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="35"
              y="10"
              width="7"
              height="32"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.5"
            />
          </svg>
          <p className="empty-title">No history yet</p>
          <p className="empty-sub">
            Every day you log is saved here automatically.
            <br />A new day starts at 2:00&nbsp;AM.
          </p>
        </div>
      ) : (
        <div className="card history-days">
          {history.map((summary) => {
            const open = openDay === summary.day;
            return (
              <div
                key={summary.day}
                className={`day-group${open ? " open" : ""}`}
              >
                <button
                  className="day-toggle"
                  onClick={() => setOpenDay(open ? null : summary.day)}
                  aria-expanded={open}
                >
                  <span className="day-label">
                    {formatDayLabel(summary.day)}
                  </span>
                  <span className="day-total">
                    {formatCalories(summary.total)}
                    <span className="unit">cal</span>
                  </span>
                  <svg
                    className="day-chevron"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M4 2l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="day-detail">
                  <div className="day-detail-clip">
                    {summary.entries.map((entry) => (
                      <div key={entry.id} className="day-entry">
                        <span className="day-entry-time">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span className="day-entry-title">
                          {entry.description || ""}
                        </span>
                        <span className="day-entry-cal">
                          +{formatCalories(entry.calories)}
                        </span>
                      </div>
                    ))}
                    {summary.day !== today && (
                      <button
                        className="backdate-btn"
                        onClick={() => setBackdating(summary.day)}
                      >
                        + Add to this day
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DataCard entries={entries} menu={menu} onImport={onImport} />

      <BackdateSheet
        day={backdating}
        trackProtein={trackProtein}
        onAdd={(cal, desc, prot, when) => {
          onAddBackdated(cal, desc, prot, when);
          showToast({ kind: "confirm", message: "Added" }, 1600);
        }}
        onClose={() => setBackdating(null)}
      />
      <Toast toast={toast} />
    </div>
  );
}
