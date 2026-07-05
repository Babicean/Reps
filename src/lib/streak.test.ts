import { describe, expect, it } from "vitest";
import { computeStreak } from "./streak";
import { weeklyStats } from "./stats";
import { createEntry } from "./store";

const entryOn = (y: number, m: number, d: number, cal = 500, protein: number | null = null) =>
  createEntry(cal, "", new Date(y, m - 1, d, 12, 0), protein);

describe("computeStreak", () => {
  it("counts consecutive logged days ending today", () => {
    const entries = [
      entryOn(2026, 7, 2),
      entryOn(2026, 7, 3),
      entryOn(2026, 7, 4),
    ];
    expect(computeStreak(entries, "2026-07-04")).toEqual({
      length: 3,
      loggedToday: true,
    });
  });

  it("keeps the chain alive when today isn't logged yet", () => {
    const entries = [entryOn(2026, 7, 2), entryOn(2026, 7, 3)];
    expect(computeStreak(entries, "2026-07-04")).toEqual({
      length: 2,
      loggedToday: false,
    });
  });

  it("breaks on a gap", () => {
    const entries = [
      entryOn(2026, 7, 1),
      // July 2 skipped
      entryOn(2026, 7, 3),
      entryOn(2026, 7, 4),
    ];
    expect(computeStreak(entries, "2026-07-04").length).toBe(2);
  });

  it("is zero with no history", () => {
    expect(computeStreak([], "2026-07-04")).toEqual({
      length: 0,
      loggedToday: false,
    });
  });

  it("multiple entries in one day count once", () => {
    const entries = [
      entryOn(2026, 7, 4, 300),
      entryOn(2026, 7, 4, 400),
    ];
    expect(computeStreak(entries, "2026-07-04").length).toBe(1);
  });
});

describe("weeklyStats", () => {
  const today = "2026-07-14";

  it("averages this week, compares with last, tracks protein", () => {
    const entries = [
      // This week: two logged days, 2000 and 1500 → avg 1750
      entryOn(2026, 7, 14, 2000, 100),
      entryOn(2026, 7, 12, 1500, 50),
      // Last week: two logged days, 2000 and 2000 → avg 2000
      entryOn(2026, 7, 6, 2000),
      entryOn(2026, 7, 5, 2000),
    ];
    const s = weeklyStats(entries, today);
    expect(s.daysLogged).toBe(2);
    expect(s.avg).toBe(1750);
    expect(s.prevAvg).toBe(2000);
    expect(s.deltaPct).toBe(-12); // 1750 vs 2000 → -12.5, Math.round → -12
    expect(s.proteinAvg).toBe(75);
  });

  it("returns nulls gracefully with no data", () => {
    const s = weeklyStats([], today);
    expect(s).toEqual({
      daysLogged: 0,
      avg: null,
      prevAvg: null,
      deltaPct: null,
      proteinAvg: null,
    });
  });

  it("omits the comparison when last week is empty", () => {
    const s = weeklyStats([entryOn(2026, 7, 14, 1800)], today);
    expect(s.avg).toBe(1800);
    expect(s.deltaPct).toBeNull();
    expect(s.proteinAvg).toBeNull();
  });
});
