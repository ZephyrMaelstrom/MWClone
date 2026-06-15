import { describe, expect, it } from "vitest";
import { statsFor, tierPower } from "../src/power.js";
import { TIERS } from "../src/config/tiers.js";

describe("tier power curve", () => {
  it("matches the locked 11-tier ladder", () => {
    expect(tierPower(1)).toBe(25);
    expect(tierPower(2)).toBe(65);
    expect(tierPower(7)).toBe(7800);
    expect(tierPower(11)).toBe(350000);
  });

  it("grows roughly 2.6x per tier", () => {
    for (let t = 2 as const; t <= 11; t++) {
      const ratio = TIERS[t as 11].power / TIERS[(t - 1) as 11].power;
      expect(ratio).toBeGreaterThan(2.4);
      expect(ratio).toBeLessThan(2.8);
    }
  });
});

describe("essence stat split", () => {
  it("splits power by essence ratio (sums to ~power)", () => {
    const s = statsFor(7, "ember"); // 4:3 of 7800
    expect(s.atk).toBe(Math.round((7800 * 4) / 7));
    expect(s.def).toBe(Math.round((7800 * 3) / 7));
    expect(s.atk + s.def).toBeCloseTo(7800, -1);
  });

  it("brimstone is attack-heavy, gleam is defense-heavy", () => {
    const brim = statsFor(8, "brimstone");
    const gleam = statsFor(8, "gleam");
    expect(brim.atk).toBeGreaterThan(brim.def * 5);
    expect(gleam.def).toBeGreaterThan(gleam.atk * 5);
  });

  it("applies grade multipliers", () => {
    const normal = statsFor(5, "ember", "normal");
    const plus = statsFor(5, "ember", "plus");
    expect(plus.atk).toBe(Math.round(normal.atk * 1.25));
  });
});
