import { useCallback, useEffect, useMemo, useState } from "react";
import type { DayKey, Entry, MenuItem } from "../types";
import { msUntilNextBoundary, trackingDayFor } from "../lib/day";
import {
  createEntry,
  entriesForDay,
  loadEntries,
  proteinForDay,
  saveEntries,
  summarizeByDay,
  totalForDay,
} from "../lib/store";
import { loadSettings, saveSettings, type Settings } from "../lib/settings";
import {
  buildQuickAdds,
  createMenuItem,
  loadMenu,
  saveMenu,
  sortMenu,
} from "../lib/menu";
import { mergeBackup, type BackupPayload } from "../lib/backup";
import { computeStreak } from "../lib/streak";
import { applyAccent, applyTheme, type AccentPref, type ThemePref } from "../lib/theme";

/**
 * Single source of truth for entries, menu, and settings. Persists on every
 * change and rolls the "today" key over automatically when the 2 AM boundary
 * passes while the app is open.
 */
export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [today, setToday] = useState<DayKey>(() => trackingDayFor(new Date()));
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [menu, setMenu] = useState<MenuItem[]>(() => loadMenu());

  useEffect(() => {
    saveMenu(menu);
  }, [menu]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  // Re-evaluate "today" exactly when the next 2 AM boundary passes.
  useEffect(() => {
    const timer = setTimeout(
      () => setToday(trackingDayFor(new Date())),
      msUntilNextBoundary(new Date()) + 1000,
    );
    return () => clearTimeout(timer);
  }, [today]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "reps.store") setEntries(loadEntries());
      if (event.key === "reps.settings") {
        const next = loadSettings();
        setSettings(next);
        applyTheme(next.theme);
        applyAccent(next.accent);
      }
      if (event.key === "reps.menu") setMenu(loadMenu());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      if (patch.theme !== undefined) applyTheme(next.theme);
      if (patch.accent !== undefined) applyAccent(next.accent);
      return next;
    });
  }, []);

  const setDailyGoal = useCallback(
    (goal: number | null) => updateSettings({ dailyGoal: goal }),
    [updateSettings],
  );
  const setTheme = useCallback(
    (theme: ThemePref) => updateSettings({ theme }),
    [updateSettings],
  );
  const setTrackProtein = useCallback(
    (trackProtein: boolean) => updateSettings({ trackProtein }),
    [updateSettings],
  );
  const setProteinTarget = useCallback(
    (proteinTarget: number | null) => updateSettings({ proteinTarget }),
    [updateSettings],
  );
  const setAccent = useCallback(
    (accent: AccentPref) => updateSettings({ accent }),
    [updateSettings],
  );

  const addEntry = useCallback(
    (
      calories: number,
      description: string,
      protein: number | null = null,
      when: Date = new Date(),
    ) => {
      const entry = createEntry(calories, description, when, protein);
      setEntries((prev) => [...prev, entry]);
      return entry;
    },
    [],
  );

  const updateEntry = useCallback(
    (
      id: string,
      calories: number,
      description: string,
      protein: number | null = null,
      timestamp?: number,
    ) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const ts = timestamp ?? e.timestamp;
          return {
            ...e,
            calories,
            description: description.trim(),
            protein,
            timestamp: ts,
            // Moving an entry in time moves it to the right tracking day.
            day: trackingDayFor(new Date(ts)),
          };
        }),
      );
    },
    [],
  );

  /** Delete an entry, returning it so the caller can offer undo. */
  const deleteEntry = useCallback(
    (id: string): Entry | null => {
      const entry = entries.find((e) => e.id === id) ?? null;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      return entry;
    },
    [entries],
  );

  /** Put a previously deleted entry back exactly as it was. */
  const restoreEntry = useCallback((entry: Entry) => {
    setEntries((prev) =>
      prev.some((e) => e.id === entry.id) ? prev : [...prev, entry],
    );
  }, []);

  const addMenuItem = useCallback(
    (
      name: string,
      calories: number,
      protein: number | null,
      category: string | null,
    ) => {
      setMenu((prev) => [
        ...prev,
        createMenuItem(name, calories, protein, category),
      ]);
    },
    [],
  );

  const updateMenuItem = useCallback(
    (
      id: string,
      name: string,
      calories: number,
      protein: number | null,
      category: string | null,
    ) => {
      setMenu((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, name: name.trim(), calories, protein, category }
            : m,
        ),
      );
    },
    [],
  );

  const deleteMenuItem = useCallback((id: string) => {
    setMenu((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const togglePinned = useCallback((id: string) => {
    setMenu((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)),
    );
  }, []);

  /** Merge an imported backup (union by id) and report what was added. */
  const importBackup = useCallback(
    (backup: BackupPayload) => {
      const result = mergeBackup(entries, menu, backup);
      setEntries(result.entries);
      setMenu(result.menu);
      if (settings.dailyGoal === null && backup.settings.dailyGoal !== null) {
        updateSettings({ dailyGoal: backup.settings.dailyGoal });
      }
      return result;
    },
    [entries, menu, settings.dailyGoal, updateSettings],
  );

  const todayEntries = useMemo(
    () => entriesForDay(entries, today),
    [entries, today],
  );
  const todayTotal = useMemo(
    () => totalForDay(entries, today),
    [entries, today],
  );
  const todayProtein = useMemo(
    () => proteinForDay(entries, today),
    [entries, today],
  );
  const history = useMemo(() => summarizeByDay(entries), [entries]);
  const quickAdds = useMemo(
    () => buildQuickAdds(menu, entries),
    [menu, entries],
  );
  const sortedMenu = useMemo(() => sortMenu(menu), [menu]);
  const streak = useMemo(
    () => computeStreak(entries, today),
    [entries, today],
  );

  return {
    today,
    entries,
    todayEntries,
    todayTotal,
    todayProtein,
    history,
    quickAdds,
    menu: sortedMenu,
    streak,
    importBackup,
    dailyGoal: settings.dailyGoal,
    setDailyGoal,
    theme: settings.theme,
    setTheme,
    trackProtein: settings.trackProtein,
    setTrackProtein,
    proteinTarget: settings.proteinTarget,
    setProteinTarget,
    accent: settings.accent,
    setAccent,
    addEntry,
    updateEntry,
    deleteEntry,
    restoreEntry,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    togglePinned,
  };
}
