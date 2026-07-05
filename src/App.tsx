import { useState } from "react";
import SettingsSheet from "./components/SettingsSheet";
import { useEntries } from "./hooks/useEntries";
import TodayScreen from "./components/TodayScreen";
import MenuScreen from "./components/MenuScreen";
import HistoryScreen from "./components/HistoryScreen";

type Tab = "today" | "menu" | "history";

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
    id: "menu",
    label: "Menu",
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path
          d="M5 2v4.5a2 2 0 01-2 2h0a2 2 0 01-2-2V2M3.5 2v13M12.75 10c-1.5 0-2.5-1.8-2.5-4.25S11.35 2 12.75 2 15 3.8 15 5.75 14.25 10 12.75 10zm0 0v5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
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
    today,
    entries,
    todayEntries,
    todayTotal,
    todayProtein,
    history,
    quickAdds,
    menu,
    streak,
    importBackup,
    dailyGoal,
    setDailyGoal,
    theme,
    setTheme,
    accent,
    setAccent,
    trackProtein,
    setTrackProtein,
    proteinTarget,
    setProteinTarget,
    addEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    togglePinned,
  } = useEntries();

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
        <TodayScreen
          key={today}
          today={today}
          total={todayTotal}
          protein={todayProtein}
          trackProtein={trackProtein}
          proteinTarget={proteinTarget}
          streak={streak}
          entries={todayEntries}
          quickAdds={quickAdds}
          menu={menu}
          dailyGoal={dailyGoal}
          onSetGoal={setDailyGoal}
          onAdd={addEntry}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
          onRestore={restoreEntry}
        />
      )}
      {tab === "menu" && (
        <MenuScreen
          menu={menu}
          trackProtein={trackProtein}
          onLog={(item) => addEntry(item.calories, item.name, item.protein)}
          onAdd={addMenuItem}
          onUpdate={updateMenuItem}
          onDelete={deleteMenuItem}
          onTogglePinned={togglePinned}
        />
      )}
      {tab === "history" && (
        <HistoryScreen
          today={today}
          history={history}
          entries={entries}
          menu={menu}
          trackProtein={trackProtein}
          onImport={importBackup}
          onAddBackdated={(cal, desc, prot, when) =>
            addEntry(cal, desc, prot, when)
          }
        />
      )}

      <SettingsSheet
        open={settingsOpen}
        theme={theme}
        onSetTheme={setTheme}
        accent={accent}
        onSetAccent={setAccent}
        trackProtein={trackProtein}
        onSetTrackProtein={setTrackProtein}
        proteinTarget={proteinTarget}
        onSetProteinTarget={setProteinTarget}
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
