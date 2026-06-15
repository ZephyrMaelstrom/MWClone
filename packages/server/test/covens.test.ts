import { beforeEach, describe, expect, it } from "vitest";
import { maxFielded } from "@cc/engine";
import { createPlayer, newCritter, resetStore } from "../src/store.js";
import {
  attackHomunculus,
  covenmateCount,
  createCoven,
  getCovenByCode,
  joinCoven,
  leaveCoven,
  summonHomunculus,
} from "../src/covens.js";

beforeEach(() => resetStore());

describe("covens", () => {
  it("create + join via code, and packmates raise the fielded cap", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    a.level = 5;
    const before = maxFielded(a.level, covenmateCount(a));
    const coven = createCoven(a, "Test Coven", now);
    expect(coven.code).toHaveLength(6);
    expect(a.grist).toBe(0); // 1000 - 1000 create cost

    const b = createPlayer("B", now);
    joinCoven(b, coven.code, now);
    expect(covenmateCount(a)).toBe(1);
    expect(covenmateCount(b)).toBe(1);
    expect(maxFielded(a.level, covenmateCount(a))).toBeGreaterThan(before);
  });

  it("rejects joining with a bad code and double membership", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    createCoven(a, "C", now);
    expect(() => createCoven(a, "C2", now)).toThrow(); // already in one
    const b = createPlayer("B", now);
    expect(() => joinCoven(b, "ZZZZZZ", now)).toThrow(); // no such code
  });

  it("leaving as leader transfers leadership; empty coven is removed", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    const coven = createCoven(a, "C", now);
    const b = createPlayer("B", now);
    joinCoven(b, coven.code, now);
    leaveCoven(a);
    expect(getCovenByCode(coven.code)?.leaderId).toBe(b.id);
    leaveCoven(b);
    expect(getCovenByCode(coven.code)).toBeUndefined();
  });

  it("summons and defeats a Homunculus, rewarding the coven", () => {
    const now = Date.now();
    const a = createPlayer("A", now);
    a.level = 5;
    a.grist = 100000;
    a.reagents = 5;
    a.stamina = 50;
    const strong = newCritter(8, "brimstone");
    a.critters.push(strong);
    a.broodIds.push(strong.id);
    a.leaderId = strong.id;
    createCoven(a, "C", now);
    summonHomunculus(a, now);
    const gristBefore = a.grist;
    let res = attackHomunculus(a, now);
    let guard = 0;
    while (!res.defeated && guard++ < 20) res = attackHomunculus(a, now);
    expect(res.defeated).toBe(true);
    expect(res.reward).toBeDefined();
    expect(a.grist).toBeGreaterThan(gristBefore);
  });
});
