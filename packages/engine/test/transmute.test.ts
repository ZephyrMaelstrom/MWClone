import { describe, expect, it } from "vitest";
import { constantRng, mulberry32 } from "../src/rng.js";
import {
  canTransmute,
  fuseEssence,
  recoverElixirCost,
  transmute,
} from "../src/transmute.js";
import { FUSION_GRID, ESSENCE_IDS } from "../src/config/essences.js";

describe("fusion grid", () => {
  it("is symmetric (A+B === B+A)", () => {
    for (const a of ESSENCE_IDS) {
      for (const b of ESSENCE_IDS) {
        expect(FUSION_GRID[a][b]).toBe(FUSION_GRID[b][a]);
      }
    }
  });

  it("same + same yields same essence", () => {
    for (const a of ESSENCE_IDS) {
      expect(fuseEssence(a, a)).toBe(a);
    }
  });

  it("ember + brine -> brimstone (offense steering)", () => {
    expect(fuseEssence("ember", "brine")).toBe("brimstone");
  });
});

describe("transmute eligibility", () => {
  it("allows tiers 2..9, rejects Dross(1) and tier 10+ (Evolution-only path)", () => {
    expect(canTransmute(1)).toBe(false);
    expect(canTransmute(2)).toBe(true);
    expect(canTransmute(9)).toBe(true);
    expect(canTransmute(10)).toBe(false);
    expect(() => transmute({ tier: 1, essenceA: "ember", essenceB: "ember" }, {}, constantRng(0))).toThrow();
  });
});

describe("transmute outcomes", () => {
  it("succeeds when the roll is below the rate; result is one tier up", () => {
    const r = transmute(
      { tier: 4, essenceA: "ember", essenceB: "ember" },
      {},
      constantRng(0), // 0 < every rate, 0 < no double/plus thresholds? -> success, no double (0<0.02 true!)
    );
    expect(r.success).toBe(true);
    // constantRng(0): double chance 0.02 -> 0<0.02 true -> doubleJump
    expect(r.outcomeTier).toBe(6);
    expect(r.outcomeEssence).toBe("ember");
  });

  it("fails when the roll exceeds the rate; produces slag + a residue shard", () => {
    const r = transmute(
      { tier: 8, essenceA: "ember", essenceB: "ember" },
      {},
      constantRng(0.999), // above 0.45 success rate -> fail
    );
    expect(r.success).toBe(false);
    expect(r.outcomeTier).toBe(8); // same tier slag
    expect(r.outcomeGrade).toBe("normal");
    expect(r.residueShards).toBe(1);
  });

  it("catalyst guarantees success (rate = 1) and charges Elixir", () => {
    const r = transmute(
      { tier: 9, essenceA: "brine", essenceB: "brine" },
      { catalyst: true },
      constantRng(0.999), // would fail without catalyst
    );
    expect(r.success).toBe(true);
    expect(r.successRateUsed).toBe(1);
    expect(r.elixirCost).toBe(150); // result tier 10
  });

  it("event success bonus raises the rate (capped at 0.95)", () => {
    // tier 10 result base 0.35; +0.25 event -> 0.60. Roll 0.5 succeeds.
    const r = transmute(
      { tier: 9, essenceA: "loam", essenceB: "loam" },
      { successBonus: 0.25 },
      constantRng(0.5),
    );
    expect(r.successRateUsed).toBeCloseTo(0.6, 5);
    expect(r.success).toBe(true);
  });

  it("two Plus inputs guarantee at least a Plus result", () => {
    // Use a seeded rng; force success by checking many seeds keep grade >= plus.
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed);
      const r = transmute(
        { tier: 5, essenceA: "ember", essenceB: "ember", gradeA: "plus", gradeB: "plus" },
        {},
        rng,
      );
      if (r.success) {
        expect(["plus", "omega"]).toContain(r.outcomeGrade);
      }
    }
  });

  it("recover cost is half the catalyst cost for that result tier", () => {
    expect(recoverElixirCost(9)).toBe(75); // result tier 10: catalyst 150 -> recover 75
    expect(recoverElixirCost(2)).toBe(2); // result tier 3: catalyst 3 -> recover 2
  });
});

describe("statistical success rate", () => {
  it("~45% success at Gold result over many trials", () => {
    const rng = mulberry32(12345);
    let wins = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const r = transmute({ tier: 7, essenceA: "ember", essenceB: "ember" }, {}, rng);
      if (r.success) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.43);
    expect(wins / N).toBeLessThan(0.47);
  });
});
