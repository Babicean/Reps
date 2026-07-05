import { describe, expect, it } from "vitest";
import { buildQuickAdds, createMenuItem, parseProtein, sortMenu } from "./menu";
import { createEntry, proteinForDay } from "./store";

const item = (
  name: string,
  calories: number,
  opts: {
    protein?: number | null;
    pinned?: boolean;
    category?: string | null;
  } = {},
) => ({
  ...createMenuItem(
    name,
    calories,
    opts.protein ?? null,
    opts.category ?? null,
    1000,
  ),
  pinned: opts.pinned ?? false,
});

describe("parseProtein", () => {
  it("treats empty input as 'not tracked'", () => {
    expect(parseProtein("")).toBeNull();
    expect(parseProtein("   ")).toBeNull();
  });

  it("accepts whole grams and rounds decimals", () => {
    expect(parseProtein("32")).toBe(32);
    expect(parseProtein("31.6")).toBe(32);
    expect(parseProtein("0")).toBe(0);
  });

  it("rejects junk and absurd values", () => {
    expect(parseProtein("abc")).toBeUndefined();
    expect(parseProtein("-5")).toBeUndefined();
    expect(parseProtein("1001")).toBeUndefined();
  });
});

describe("sortMenu", () => {
  it("puts pinned items first, then alphabetical", () => {
    const sorted = sortMenu([
      item("Pepsi 300ml", 129),
      item("Mini Cali Burrito", 545, { pinned: true }),
      item("Energy drink", 160, { pinned: true }),
    ]);
    expect(sorted.map((m) => m.name)).toEqual([
      "Energy drink",
      "Mini Cali Burrito",
      "Pepsi 300ml",
    ]);
  });

  it("clusters by category within a pin group", () => {
    const sorted = sortMenu([
      item("Pepsi 300ml", 129, { category: "drink" }),
      item("Chicken & rice", 640, { category: "meat" }),
      item("Energy drink", 160, { category: "drink" }),
      item("Mystery leftovers", 400), // uncategorized sorts last
    ]);
    expect(sorted.map((m) => m.name)).toEqual([
      "Chicken & rice",
      "Energy drink",
      "Pepsi 300ml",
      "Mystery leftovers",
    ]);
  });
});

describe("buildQuickAdds — pinned menu items merge with learned frequents", () => {
  const at = (day: number, hour: number) => new Date(2026, 5, day, hour, 0);

  it("puts pinned items ahead of learned frequents and dedupes", () => {
    const menu = [
      item("Mini Cali Burrito", 545, { pinned: true, protein: 32 }),
      item("Pepsi 300ml", 129), // not pinned — stays off Today
    ];
    const entries = [
      // "Flat white" learned by repetition
      createEntry(180, "Flat white", at(1, 8)),
      createEntry(180, "Flat white", at(2, 8)),
      // Same as the pinned burrito — must not appear twice
      createEntry(545, "mini cali burrito", at(1, 13)),
      createEntry(545, "Mini Cali Burrito", at(2, 13)),
    ];
    const chips = buildQuickAdds(menu, entries);
    expect(chips.map((c) => c.description)).toEqual([
      "Mini Cali Burrito",
      "Flat white",
    ]);
    expect(chips[0].protein).toBe(32);
  });

  it("respects the overall limit", () => {
    const menu = ["A", "B", "C", "D", "E", "F", "G"].map((n) =>
      item(n, 100, { pinned: true }),
    );
    expect(buildQuickAdds(menu, [], 6)).toHaveLength(6);
  });
});

describe("protein day totals", () => {
  it("sums only entries that carry protein", () => {
    const entries = [
      createEntry(545, "Burrito", new Date(2026, 6, 4, 12, 0), 32),
      createEntry(160, "Energy drink", new Date(2026, 6, 4, 9, 0), null),
      createEntry(300, "Tacos", new Date(2026, 6, 4, 19, 0), 24),
      createEntry(300, "Yesterday's tacos", new Date(2026, 6, 3, 19, 0), 24),
    ];
    expect(proteinForDay(entries, "2026-07-04")).toBe(56);
  });
});
