import { describe, expect, it } from "vitest";
import { broodTotals, resolveRaid, leaderAtkBonus } from "../src/combat.js";
import { constantRng, mulberry32 } from "../src/rng.js";
import type { Critter } from "../src/types.js";

const critter = (tier: Critter["tier"], essence: Critter["essence"], grade: Critter["grade"] = "normal"): Critter => ({
  id: `${tier}-${essence}-${grade}`,
  speciesId: "x",
  tier,
  essence,
  grade,
});

describe("brood totals", () => {
  it("sums stats and tracks the top tier", () => {
    const brood = [critter(3, "brimstone"), critter(5, "gleam")];
    const t = broodTotals(brood);
    expect(t.topTier).toBe(5);
    expect(t.atk).toBeGreaterThan(0);
    expect(t.def).toBeGreaterThan(0);
  });

  it("brimstone leader boosts team ATK", () => {
    const brood = [critter(4, "ember"), critter(4, "ember")];
    const base = broodTotals(brood);
    const led = broodTotals(brood, critter(11, "brimstone"));
    expect(led.atk).toBeGreaterThan(base.atk);
    expect(leaderAtkBonus("brimstone", 11)).toBeCloseTo(0.12, 5);
    expect(leaderAtkBonus("ember", 11)).toBe(0); // non-brimstone leader: no ATK bonus
  });
});

describe("raid resolution", () => {
  it("with neutral rolls, higher ATK beats lower DEF", () => {
    const r = resolveRaid(1000, 800, 5, constantRng(0.5));
    expect(r.win).toBe(true);
    expect(r.variance).toBe(0.15);
  });

  it("widens variance to 0.25 when a tier 9+ critter is involved", () => {
    const r = resolveRaid(1000, 1000, 9, constantRng(0.5));
    expect(r.variance).toBe(0.25);
  });

  it("is probabilistic near parity (not always the same winner)", () => {
    const rng = mulberry32(7);
    let aWins = 0;
    for (let i = 0; i < 1000; i++) {
      if (resolveRaid(1000, 1000, 5, rng).win) aWins++;
    }
    expect(aWins).toBeGreaterThan(350);
    expect(aWins).toBeLessThan(650);
  });
});
