import { describe, expect, it } from "vitest";
import { plateBreakdown } from "./plates";

describe("plateBreakdown", () => {
  it("returns the empty bar at exactly 20", () => {
    expect(plateBreakdown(20)).toEqual([]);
  });

  it("builds simple loads heaviest-first", () => {
    expect(plateBreakdown(60)).toEqual([20]);
    expect(plateBreakdown(100)).toEqual([25, 15]);
    expect(plateBreakdown(85)).toEqual([25, 5, 2.5]);
  });

  it("uses the 1.25 plate for quarter steps", () => {
    expect(plateBreakdown(62.5)).toEqual([20, 1.25]);
    expect(plateBreakdown(22.5)).toEqual([1.25]);
  });

  it("refuses weights below the bar", () => {
    expect(plateBreakdown(17.5)).toBeNull();
    expect(plateBreakdown(0)).toBeNull();
  });

  it("refuses weights that standard plates cannot build", () => {
    expect(plateBreakdown(21)).toBeNull(); // 0.5 per side
    expect(plateBreakdown(20.5)).toBeNull(); // 0.25 per side
  });

  it("handles heavy loads with repeated plates", () => {
    expect(plateBreakdown(180)).toEqual([25, 25, 25, 5]);
    expect(plateBreakdown(220)).toEqual([25, 25, 25, 25]);
  });
});
