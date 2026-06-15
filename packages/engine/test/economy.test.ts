import { describe, expect, it } from "vitest";
import {
  apparatusCost,
  gristPerHour,
  healCost,
  maxFielded,
  offlineGrist,
  raidSteal,
  regenPoints,
  resourceCap,
  vaultFee,
  xpForLevel,
} from "../src/economy.js";

describe("apparatus / idle income", () => {
  it("nth-of-type cost grows 10% per owned", () => {
    expect(apparatusCost(200, 0)).toBe(200);
    expect(apparatusCost(200, 1)).toBe(220);
    expect(apparatusCost(200, 5)).toBe(300);
  });

  it("sums grist/hour across owned apparatus", () => {
    expect(gristPerHour({ hut: 3, forge: 1 })).toBe(3 * 5 + 500);
  });

  it("caps offline accrual at 24h", () => {
    expect(offlineGrist(100, 3600)).toBe(100);
    expect(offlineGrist(100, 48 * 3600)).toBe(100 * 24); // capped
  });
});

describe("friendly PvP economy", () => {
  it("steals 10% of un-vaulted Grist", () => {
    expect(raidSteal(1000)).toBe(100);
  });

  it("charges a 5% vault fee", () => {
    expect(vaultFee(1000)).toBe(50);
  });
});

describe("resources", () => {
  it("caps scale with level", () => {
    expect(resourceCap("energy", 1)).toBe(20);
    expect(resourceCap("energy", 6)).toBe(30);
    expect(resourceCap("stamina", 1)).toBe(15);
  });

  it("regen is points per elapsed seconds", () => {
    expect(regenPoints("stamina", 90)).toBe(1);
    expect(regenPoints("stamina", 450)).toBe(5);
    expect(regenPoints("energy", 120)).toBe(1);
  });
});

describe("progression", () => {
  it("xp curve increases with level", () => {
    expect(xpForLevel(1)).toBe(60);
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(5));
  });

  it("heal cost scales with level squared", () => {
    expect(healCost(10)).toBe(200);
  });

  it("maxFielded grows with level and covenmates, capped at 120", () => {
    expect(maxFielded(1, 0)).toBe(13);
    expect(maxFielded(10, 5)).toBe(12 + 10 + 15);
    expect(maxFielded(200, 50)).toBe(120);
  });
});
