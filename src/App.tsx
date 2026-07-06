import { useState } from "react";
import SettingsSheet from "./components/SettingsSheet";
import { useWorkouts } from "./hooks/useWorkouts";
import WorkoutScreen from "./components/WorkoutScreen";
import RoutinesScreen from "./components/RoutinesScreen";
import HistoryScreen from "./components/HistoryScreen";

type Tab = "today" | "routines" | "history";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle
          cx="8.5"
          cy="8.5"
          r="6.75"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="8.5" cy="8.5" r="2.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "routines",
    label: "Routines",
    icon: (
      // A barbell: two plates each side, bar through the middle.
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="2" y="5.5" width="2" height="6" rx="0.8" fill="currentColor" />
        <rect x="13" y="5.5" width="2" height="6" rx="0.8" fill="currentColor" />
        <rect
          x="4.6"
          y="4"
          width="2"
          height="9"
          rx="0.8"
          fill="currentColor"
        />
        <rect
          x="10.4"
          y="4"
          width="2"
          height="9"
          rx="0.8"
          fill="currentColor"
        />
        <rect x="6.6" y="7.6" width="3.8" height="1.8" rx="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path
          d="M2.5 14.5v-4M8.5 14.5v-8M14.5 14.5V2.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const {
    finishedSessions,
    sessions,
    sets,
    routines,
    activeSession,
    activeSets,
    activeVolume,
    suggested,
    weekCount,
    streak,
    weeks,
    startSession,
    finishSession,
    discardSession,
    deleteSession,
    updateSessionDuration,
    logSet,
    deleteSet,
    restoreSet,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    importBackup,
    weeklyTarget,
    setWeeklyTarget,
    theme,
    setTheme,
    accent,
    setAccent,
    settings,
  } = useWorkouts();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gearSpin, setGearSpin] = useState(false);

  return (
    <div className="app">
      <div className="top-bar">
        <span className="wordmark">Reps</span>
        <button
          className={`settings-btn${gearSpin ? " spinning" : ""}`}
          onClick={() => {
            setGearSpin(true);
            setSettingsOpen(true);
          }}
          onAnimationEnd={() => setGearSpin(false)}
          aria-label="Settings"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {tab === "today" && (
        <WorkoutScreen
          routines={routines}
          sessions={sessions}
          sets={sets}
          activeSession={activeSession}
          activeSets={activeSets}
          activeVolume={activeVolume}
          suggested={suggested}
          weekCount={weekCount}
          weeklyTarget={weeklyTarget}
          streak={streak}
          onStart={startSession}
          onFinish={finishSession}
          onDiscard={discardSession}
          onLogSet={logSet}
          onDeleteSet={deleteSet}
          onRestoreSet={restoreSet}
        />
      )}
      {tab === "routines" && (
        <RoutinesScreen
          routines={routines}
          onAdd={addRoutine}
          onUpdate={updateRoutine}
          onDelete={deleteRoutine}
        />
      )}
      {tab === "history" && (
        <HistoryScreen
          sessions={finishedSessions}
          sets={sets}
          routines={routines}
          weeks={weeks}
          settings={settings}
          onImport={importBackup}
          onDeleteSession={deleteSession}
          onUpdateDuration={updateSessionDuration}
        />
      )}

      <SettingsSheet
        open={settingsOpen}
        theme={theme}
        onSetTheme={setTheme}
        accent={accent}
        onSetAccent={setAccent}
        weeklyTarget={weeklyTarget}
        onSetWeeklyTarget={setWeeklyTarget}
        onClose={() => setSettingsOpen(false)}
      />

      <div className="bottom-scrim" aria-hidden="true" />
      <nav className="tabbar-wrap" aria-label="Screens">
        <div className="tabbar">
          <span
            className="tab-indicator"
            style={{
              transform: `translateX(${TABS.findIndex((t) => t.id === tab) * 100}%)`,
            }}
            aria-hidden="true"
          />
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
