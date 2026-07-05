import { describe, expect, it } from "vitest";
import type { Session } from "../types";
import { recentWeeks, sessionsInWeek, weekKeyFor, weeklyStreak } from "./week";

const session = (id: string, day: string, endedAt: number | null = 1): Session => ({
  id,
  routineId: null,
  routineName: "Push",
  startedAt: 0,
  endedAt,
  day,
});

describe("weekKeyFor", () => {
  it("maps any day to its Monday", () => {
    expect(weekKeyFor("2026-07-01")).toBe("2026-06-29"); // Wednesday
    expect(weekKeyFor("2026-06-29")).toBe("2026-06-29"); // Monday
    expect(weekKeyFor("2026-07-05")).toBe("2026-06-29"); // Sunday
    expect(weekKeyFor("2026-07-06")).toBe("2026-07-06"); // next Monday
  });
});

describe("sessionsInWeek", () => {
  it("counts only finished sessions in the week", () => {
    const sessions = [
      session("a", "2026-07-01"),
      session("b", "2026-07-05"),
      session("c", "2026-07-06"),
      session("d", "2026-07-02", null), // live, doesn't count
    ];
    expect(sessionsInWeek(sessions, "2026-06-29")).toHaveLength(2);
    expect(sessionsInWeek(sessions, "2026-07-06")).toHaveLength(1);
  });
});

describe("weeklyStreak", () => {
  // "now" is Sunday 2026-07-05; this week is 2026-06-29.
  const now = new Date(2026, 6, 5, 12);

  it("counts consecutive on-target weeks, including this one when met", () => {
    const sessions = [
      // this week: 3
      session("a", "2026-06-29"),
      session("b", "2026-07-01"),
      session("c", "2026-07-03"),
      // last week: 3
      session("d", "2026-06-22"),
      session("e", "2026-06-24"),
      session("f", "2026-06-26"),
      // two weeks back: only 2 — streak stops here
      session("g", "2026-06-15"),
      session("h", "2026-06-17"),
    ];
    expect(weeklyStreak(sessions, 3, now)).toBe(2);
  });

  it("doesn't count this week while it's still short", () => {
    const sessions = [
      session("a", "2026-07-01"),
      session("d", "2026-06-22"),
      session("e", "2026-06-24"),
      session("f", "2026-06-26"),
    ];
    expect(weeklyStreak(sessions, 3, now)).toBe(1);
  });

  it("is zero with no target", () => {
    expect(weeklyStreak([session("a", "2026-07-01")], 0, now)).toBe(0);
  });
});

describe("recentWeeks", () => {
  it("returns the requested window oldest-first with volumes", () => {
    const now = new Date(2026, 6, 5, 12);
    const sessions = [session("a", "2026-07-01")];
    const sets = [
      {
        id: "x",
        sessionId: "a",
        exercise: "Bench",
        weight: 70,
        reps: 10,
        timestamp: 0,
      },
    ];
    const weeks = recentWeeks(sessions, sets, 3, now);
    expect(weeks).toHaveLength(3);
    expect(weeks[2].week).toBe("2026-06-29");
    expect(weeks[2].sessionCount).toBe(1);
    expect(weeks[2].volume).toBe(700);
    expect(weeks[0].volume).toBe(0);
  });
});
