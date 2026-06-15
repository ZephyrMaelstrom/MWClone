import { beforeEach, describe, expect, it } from "vitest";
import { createPlayer, newCritter, resetStore } from "../src/store.js";
import { attackBoss, getBoss } from "../src/worldboss.js";

beforeEach(() => resetStore());

describe("World Boss — The Aberration", () => {
  it("spawns at level 1 and takes damage from an attack", () => {
    const now = Date.now();
    const p = createPlayer("B", now);
    const boss = getBoss(now);
    expect(boss.level).toBe(1);
    const res = attackBoss(p, 1, now);
    expect(res.damage).toBeGreaterThan(0);
    expect(res.bossHp).toBeLessThan(res.bossMaxHp);
    expect(p.bossAp).toBe(9); // 1x costs 1 AP
  });

  it("rejects attacks without enough Boss AP", () => {
    const now = Date.now();
    const p = createPlayer("B", now);
    p.bossAp = 0;
    expect(() => attackBoss(p, 50, now)).toThrow();
  });

  it("defeating the boss rewards participants and respawns a tougher one", () => {
    const now = Date.now();
    const p = createPlayer("B", now);
    p.bossAp = 1000;
    const strong = newCritter(8, "brimstone"); // huge ATK -> one-shot
    p.critters.push(strong);
    p.broodIds.push(strong.id);
    p.leaderId = strong.id;
    const gristBefore = p.grist;

    const res = attackBoss(p, 50, now);
    expect(res.defeated).toBe(true);
    expect(res.reward).toBeDefined();
    expect(p.grist).toBeGreaterThan(gristBefore);

    expect(getBoss(now).level).toBe(2); // respawned tougher
  });
});
