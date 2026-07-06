import { describe, expect, it } from "vitest";
import type { Routine, Session, SetEntry } from "../types";
import {
  bestWeightFor,
  createRoutineExercise,
  groupByExercise,
  isPersonalRecord,
  lastTimeFor,
  parseReps,
  parseWeight,
  exerciseTrend,
  personalRecords,
  previousSessionOf,
  suggestNextRoutine,
  volumeAtElapsed,
  volumeOf,
} from "./workout";

const session = (id: string, startedAt: number, routineId: string | null = null): Session => ({
  id,
  routineId,
  routineName: "Push",
  startedAt,
  endedAt: startedAt + 3600e3,
  day: "2026-07-01",
});

const set = (
  id: string,
  sessionId: string,
  exercise: string,
  weight: number | null,
  reps: number,
  timestamp = 0,
): SetEntry => ({ id, sessionId, exercise, weight, reps, timestamp });

describe("parseWeight", () => {
  it("accepts kg with quarter precision and comma decimals", () => {
    expect(parseWeight("17.5")).toBe(17.5);
    expect(parseWeight("11,25")).toBe(11.25);
    expect(parseWeight("100")).toBe(100);
  });
  it("blank means bodyweight", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight("  ")).toBeNull();
  });
  it("rejects nonsense", () => {
    expect(parseWeight("heavy")).toBeUndefined();
    expect(parseWeight("-5")).toBeUndefined();
    expect(parseWeight("1500")).toBeUndefined();
  });
});

describe("parseReps", () => {
  it("accepts whole positive reps", () => {
    expect(parseReps("8")).toBe(8);
  });
  it("rejects zero, fractions, and nonsense", () => {
    expect(parseReps("0")).toBeUndefined();
    expect(parseReps("7.5")).toBeUndefined();
    expect(parseReps("many")).toBeUndefined();
  });
});

describe("volumeOf", () => {
  it("sums weight × reps, bodyweight adds nothing", () => {
    expect(
      volumeOf([
        set("a", "s", "Bench", 70, 10),
        set("b", "s", "Dips", null, 12),
        set("c", "s", "Bench", 70, 8),
      ]),
    ).toBe(700 + 560);
  });
});

describe("lastTimeFor", () => {
  const sessions = [session("s1", 1000), session("s2", 2000)];
  const sets = [
    set("a", "s1", "Hammer curl", 15, 10, 1),
    set("b", "s1", "Hammer curl", 15, 9, 2),
    set("c", "s2", "hammer curl", 17.5, 8, 3),
  ];

  it("returns the most recent session's sets, case-insensitively", () => {
    const last = lastTimeFor("Hammer Curl", sets, sessions, []);
    expect(last?.fromSeed).toBe(false);
    expect(last?.sets).toEqual([{ weight: 17.5, reps: 8 }]);
  });

  it("excludes the live session", () => {
    const last = lastTimeFor("Hammer curl", sets, sessions, [], "s2");
    expect(last?.sets).toEqual([
      { weight: 15, reps: 10 },
      { weight: 15, reps: 9 },
    ]);
  });

  it("falls back to the routine seed before any history", () => {
    const routines: Routine[] = [
      {
        id: "r",
        name: "Pull",
        createdAt: 0,
        exercises: [createRoutineExercise("Preacher curl", 3, 50, 7)],
      },
    ];
    const last = lastTimeFor("preacher curl", [], [], routines);
    expect(last?.fromSeed).toBe(true);
    expect(last?.sets).toHaveLength(3);
    expect(last?.sets[0]).toEqual({ weight: 50, reps: 7 });
  });
});

describe("isPersonalRecord", () => {
  const history = [
    set("a", "s1", "Bench", 70, 10),
    set("b", "s1", "Bench", 75, 6),
  ];
  it("beats every prior weight", () => {
    expect(isPersonalRecord("Bench", 77.5, history)).toBe(true);
    expect(isPersonalRecord("bench", 75, history)).toBe(false);
    expect(isPersonalRecord("Bench", 70, history)).toBe(false);
  });
  it("never fires on the first-ever set or bodyweight", () => {
    expect(isPersonalRecord("Squat", 100, history)).toBe(false);
    expect(isPersonalRecord("Bench", null, history)).toBe(false);
  });
});

describe("bestWeightFor", () => {
  it("finds the heaviest logged weight", () => {
    expect(
      bestWeightFor("Bench", [
        set("a", "s", "Bench", 70, 10),
        set("b", "s", "Bench", 77.5, 4),
        set("c", "s", "Dips", null, 12),
      ]),
    ).toBe(77.5);
    expect(bestWeightFor("Dips", [set("c", "s", "Dips", null, 12)])).toBeNull();
  });
});

describe("suggestNextRoutine", () => {
  const routines: Routine[] = [
    { id: "push", name: "Push", createdAt: 0, exercises: [] },
    { id: "pull", name: "Pull", createdAt: 1, exercises: [] },
    { id: "legs", name: "Legs", createdAt: 2, exercises: [] },
  ];

  it("suggests the first routine with no history", () => {
    expect(suggestNextRoutine(routines, [])?.id).toBe("push");
  });

  it("cycles from the last finished session", () => {
    expect(
      suggestNextRoutine(routines, [session("s", 100, "push")])?.id,
    ).toBe("pull");
    expect(
      suggestNextRoutine(routines, [session("s", 100, "legs")])?.id,
    ).toBe("push");
  });

  it("prefers the most recent finished session", () => {
    const older = session("s1", 100, "push");
    const newer = session("s2", 200, "pull");
    expect(suggestNextRoutine(routines, [older, newer])?.id).toBe("legs");
  });
});

describe("groupByExercise", () => {
  it("groups in first-logged order, case-insensitively", () => {
    const groups = groupByExercise([
      set("a", "s", "Bench", 70, 10, 1),
      set("b", "s", "Flys", 100, 7, 2),
      set("c", "s", "bench", 70, 8, 3),
    ]);
    expect(groups.map((g) => g.exercise)).toEqual(["Bench", "Flys"]);
    expect(groups[0].sets).toHaveLength(2);
  });
});

describe("previousSessionOf", () => {
  const sessions: Session[] = [
    session("a", 1000, "r1"),
    session("b", 2000, "r1"),
    { ...session("c", 3000, "r1"), endedAt: null }, // live — never a ghost
    session("live", 4000, "r1"),
  ];
  it("finds the latest finished session of the routine", () => {
    const ghost = previousSessionOf("r1", "Push", sessions, "live");
    expect(ghost?.id).toBe("b");
  });
  it("matches by name when ids are missing", () => {
    const ghost = previousSessionOf(null, "push ", sessions, "live");
    expect(ghost?.id).toBe("b");
  });
  it("returns null with no history", () => {
    expect(previousSessionOf("r9", "Arms", sessions, "live")).toBeNull();
  });
});

describe("volumeAtElapsed", () => {
  const sets = [
    set("1", "g", "Bench", 80, 5, 1000 + 60e3),
    set("2", "g", "Bench", 80, 5, 1000 + 120e3),
    set("3", "g", "Bench", 80, 5, 1000 + 300e3),
  ];
  it("counts only sets logged by that point in the session", () => {
    expect(volumeAtElapsed(sets, 1000, 150e3)).toBe(800);
    expect(volumeAtElapsed(sets, 1000, 10e3)).toBe(0);
    expect(volumeAtElapsed(sets, 1000, 999e3)).toBe(1200);
  });
});

describe("personalRecords", () => {
  const sets = [
    set("1", "a", "Bench", 80, 7, 100),
    set("2", "b", "Bench", 85, 5, 200),
    set("3", "b", "bench", 85, 7, 300), // case-insensitive, more reps wins
    set("4", "a", "Dips", null, 10, 100),
    set("5", "b", "Dips", null, 12, 200),
    set("6", "a", "Curl", 20, 10, 100),
  ];
  it("finds heaviest weight and best reps at that weight", () => {
    const [bench] = personalRecords(sets);
    expect(bench.exercise).toBe("Bench");
    expect(bench.weight).toBe(85);
    expect(bench.reps).toBe(7);
    expect(bench.sessions).toBe(2);
    expect(bench.volume).toBe(80 * 7 + 85 * 5 + 85 * 7);
  });
  it("tracks bodyweight work by reps, sorted after weighted", () => {
    const records = personalRecords(sets);
    expect(records.map((r) => r.exercise)).toEqual(["Bench", "Curl", "Dips"]);
    const dips = records[2];
    expect(dips.weight).toBeNull();
    expect(dips.reps).toBe(12);
  });
});

describe("exerciseTrend", () => {
  const sessions: Session[] = [session("a", 1000), session("b", 2000)];
  const sets = [
    set("1", "a", "Bench", 80, 7, 1100),
    set("2", "a", "Bench", 82.5, 5, 1200),
    set("3", "b", "Bench", 85, 5, 2100),
    set("4", "b", "Squat", 100, 5, 2200),
  ];
  it("returns each session's top set, oldest first", () => {
    const trend = exerciseTrend("bench", sets, sessions);
    expect(trend.map((p) => p.weight)).toEqual([82.5, 85]);
    expect(trend[0].volume).toBe(80 * 7 + 82.5 * 5);
  });
  it("ignores other exercises and unknown sessions", () => {
    expect(exerciseTrend("Squat", sets, sessions)).toHaveLength(1);
    expect(exerciseTrend("Deadlift", sets, sessions)).toHaveLength(0);
  });
});
