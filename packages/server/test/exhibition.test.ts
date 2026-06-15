import { beforeEach, describe, expect, it } from "vitest";
import { createPlayer, newCritter, resetStore } from "../src/store.js";
import { buyRenownEgg, fight, opponents, standings } from "../src/exhibition.js";

beforeEach(() => resetStore());

describe("exhibition", () => {
  it("a stronger brood wins, gains rating + Renown", () => {
    const now = Date.now();
    const strong = createPlayer("Strong", now);
    strong.stamina = 50;
    const big = newCritter(9, "brimstone");
    strong.critters.push(big);
    strong.broodIds.push(big.id);
    strong.leaderId = big.id;
    const weak = createPlayer("Weak", now);

    const res = fight(strong, weak.id, now);
    expect(res.win).toBe(true);
    expect(res.ratingAfter).toBeGreaterThan(res.ratingBefore);
    expect(strong.renown).toBeGreaterThan(0);
    expect(strong.arenaWins).toBe(1);
  });

  it("lists nearby opponents and standings", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    createPlayer("B", now);
    expect(opponents(a, 6, now).length).toBeGreaterThan(0);
    const board = standings(now);
    expect(board.seasonId).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(board.rows)).toBe(true);
  });

  it("Renown shop grants a critter for Renown", () => {
    const now = Date.now();
    const p = createPlayer("R", now);
    p.renown = 1000;
    const before = p.critters.length;
    const critter = buyRenownEgg(p);
    expect(p.renown).toBe(200); // 1000 - 800
    expect(p.critters.length).toBe(before + 1);
    expect(critter.tier).toBeGreaterThanOrEqual(5);
  });

  it("rejects fighting without Stamina", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    const b = createPlayer("B", now);
    a.stamina = 0;
    expect(() => fight(a, b.id, now)).toThrow();
  });
});
