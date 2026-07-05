import { useCallback, useEffect, useMemo, useState } from "react";
import type { Routine, Session, SetEntry } from "../types";
import {
  createSession,
  createSet,
  loadRoutines,
  loadSessions,
  loadSets,
  saveRoutines,
  saveSessions,
  saveSets,
  setsForSession,
  suggestNextRoutine,
  volumeOf,
} from "../lib/workout";
import { loadSettings, saveSettings, type Settings } from "../lib/settings";
import { mergeBackup, type BackupPayload } from "../lib/backup";
import {
  recentWeeks,
  sessionsInWeek,
  thisWeekKey,
  weeklyStreak,
} from "../lib/week";
import { applyAccent, applyTheme, type AccentPref, type ThemePref } from "../lib/theme";

/**
 * Single source of truth for sessions, sets, routines, and settings.
 * Persists on every change; mirrors Tally's useEntries shape.
 */
export function useWorkouts() {
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [sets, setSets] = useState<SetEntry[]>(() => loadSets());
  const [routines, setRoutines] = useState<Routine[]>(() => loadRoutines());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);
  useEffect(() => {
    saveSets(sets);
  }, [sets]);
  useEffect(() => {
    saveRoutines(routines);
  }, [routines]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "reps.sessions") setSessions(loadSessions());
      if (event.key === "reps.sets") setSets(loadSets());
      if (event.key === "reps.routines") setRoutines(loadRoutines());
      if (event.key === "reps.settings") {
        const next = loadSettings();
        setSettings(next);
        applyTheme(next.theme);
        applyAccent(next.accent);
      }
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

  const setTheme = useCallback(
    (theme: ThemePref) => updateSettings({ theme }),
    [updateSettings],
  );
  const setAccent = useCallback(
    (accent: AccentPref) => updateSettings({ accent }),
    [updateSettings],
  );
  const setWeeklyTarget = useCallback(
    (weeklyTarget: number | null) => updateSettings({ weeklyTarget }),
    [updateSettings],
  );

  /* ---- session lifecycle ------------------------------------------------ */

  const activeSession = useMemo(
    () => sessions.find((s) => s.endedAt === null) ?? null,
    [sessions],
  );

  const startSession = useCallback((routine: Routine | null) => {
    const session = createSession(routine);
    setSessions((prev) => [...prev, session]);
    return session;
  }, []);

  const finishSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, endedAt: Date.now() } : s)),
    );
  }, []);

  /** Abandon a session that has no sets — no empty husks in History. */
  const discardSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSets((prev) => prev.filter((s) => s.sessionId !== id));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSets((prev) => prev.filter((s) => s.sessionId !== id));
  }, []);

  /* ---- sets -------------------------------------------------------------- */

  const logSet = useCallback(
    (sessionId: string, exercise: string, weight: number | null, reps: number) => {
      const entry = createSet(sessionId, exercise, weight, reps);
      setSets((prev) => [...prev, entry]);
      return entry;
    },
    [],
  );

  const deleteSet = useCallback((id: string): SetEntry | null => {
    let removed: SetEntry | null = null;
    setSets((prev) => {
      removed = prev.find((s) => s.id === id) ?? null;
      return prev.filter((s) => s.id !== id);
    });
    return removed;
  }, []);

  const restoreSet = useCallback((entry: SetEntry) => {
    setSets((prev) =>
      prev.some((s) => s.id === entry.id) ? prev : [...prev, entry],
    );
  }, []);

  /* ---- routines ----------------------------------------------------------- */

  const addRoutine = useCallback((routine: Routine) => {
    setRoutines((prev) => [...prev, routine]);
  }, []);

  const updateRoutine = useCallback((routine: Routine) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === routine.id ? routine : r)),
    );
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /* ---- backup -------------------------------------------------------------- */

  const importBackup = useCallback(
    (backup: BackupPayload) => {
      const result = mergeBackup(sessions, sets, routines, backup);
      setSessions(result.sessions);
      setSets(result.sets);
      setRoutines(result.routines);
      return result;
    },
    [sessions, sets, routines],
  );

  /* ---- derived ---------------------------------------------------------------- */

  const activeSets = useMemo(
    () => (activeSession ? setsForSession(sets, activeSession.id) : []),
    [sets, activeSession],
  );
  const activeVolume = useMemo(() => volumeOf(activeSets), [activeSets]);
  const suggested = useMemo(
    () => suggestNextRoutine(routines, sessions),
    [routines, sessions],
  );
  const weekCount = useMemo(
    () => sessionsInWeek(sessions, thisWeekKey()).length,
    [sessions],
  );
  const streak = useMemo(
    () => weeklyStreak(sessions, settings.weeklyTarget ?? 0),
    [sessions, settings.weeklyTarget],
  );
  const weeks = useMemo(
    () => recentWeeks(sessions, sets, 8),
    [sessions, sets],
  );
  const finishedSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.endedAt !== null)
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions],
  );

  return {
    sessions,
    finishedSessions,
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
    logSet,
    deleteSet,
    restoreSet,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    importBackup,
    weeklyTarget: settings.weeklyTarget,
    setWeeklyTarget,
    theme: settings.theme,
    setTheme,
    accent: settings.accent,
    setAccent,
    settings,
  };
}
