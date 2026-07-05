import { describe, expect, it } from "vitest";
import type { Routine, Session, SetEntry } from "../types";
import { buildBackup, mergeBackup, parseBackup } from "./backup";

const sessions: Session[] = [
  {
    id: "s1",
    routineId: "r1",
    routineName: "Push",
    startedAt: 100,
    endedAt: 200,
    day: "2026-07-01",
  },
];
const sets: SetEntry[] = [
  {
    id: "x1",
    sessionId: "s1",
    exercise: "Bench",
    weight: 70,
    reps: 10,
    timestamp: 150,
  },
];
const routines: Routine[] = [
  { id: "r1", name: "Push", createdAt: 0, exercises: [] },
];
const settings = {
  weeklyTarget: 3,
  theme: "dark" as const,
  accent: "azure" as const,
};

describe("backup round-trip", () => {
  it("builds and parses everything back", () => {
    const json = buildBackup(sessions, sets, routines, settings);
    const parsed = parseBackup(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.sessions).toHaveLength(1);
    expect(parsed!.sets[0].exercise).toBe("Bench");
    expect(parsed!.routines[0].name).toBe("Push");
    expect(parsed!.settings.weeklyTarget).toBe(3);
    expect(parsed!.settings.theme).toBe("dark");
  });

  it("rejects foreign or corrupt files", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup('{"app":"tally","entries":[]}')).toBeNull();
    expect(parseBackup('{"app":"reps"}')).toBeNull();
  });
});

describe("mergeBackup", () => {
  const backup = parseBackup(buildBackup(sessions, sets, routines, settings))!;

  it("adds only what's new, by id", () => {
    const result = mergeBackup(sessions, sets, routines, backup);
    expect(result.addedSessions).toBe(0);
    expect(result.addedSets).toBe(0);
    expect(result.addedRoutines).toBe(0);
  });

  it("imports onto an empty phone", () => {
    const result = mergeBackup([], [], [], backup);
    expect(result.addedSessions).toBe(1);
    expect(result.addedSets).toBe(1);
    expect(result.addedRoutines).toBe(1);
  });

  it("dedupes routines by name even with different ids", () => {
    const renamedId: Routine[] = [
      { id: "other", name: "push", createdAt: 5, exercises: [] },
    ];
    const result = mergeBackup([], [], renamedId, backup);
    expect(result.addedRoutines).toBe(0);
  });
});
