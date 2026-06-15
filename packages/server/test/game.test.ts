import { beforeEach, describe, expect, it } from "vitest";
import { constantRng } from "@cc/engine";
import { createPlayer, resetStore } from "../src/store.js";
import { doQuest, regenResources, resourceView, setRngFactory } from "../src/game.js";

beforeEach(() => resetStore());

describe("energy regeneration", () => {
  it("regenerates +1 per 120s up to the level cap", () => {
    const now = 1_000_000;
    const p = createPlayer("R", now);
    p.energy = 0;
    p.energyTs = now;
    regenResources(p, now + 5 * 60 * 1000); // 300s -> 2 points
    expect(p.energy).toBe(2);
  });

  it("never exceeds the cap", () => {
    const p = createPlayer("R", 0);
    p.energy = 0;
    p.energyTs = 0;
    regenResources(p, 10_000_000);
    expect(p.energy).toBe(20); // L1 cap
  });

  it("resourceView reports value, max and seconds to next point", () => {
    const p = createPlayer("R", 0);
    p.energy = 5;
    p.energyTs = 0;
    const v = resourceView(p, "energy", 30_000); // 30s elapsed
    expect(v).toEqual({ value: 5, max: 20, secondsToNext: 90 });
  });

  it("questing from a non-full pool preserves partial regen progress", () => {
    setRngFactory(() => constantRng(0.99));
    const now = 1_000_000;
    const p = createPlayer("R", now);
    p.energy = 10;
    p.energyTs = now - 60_000; // 60s into the current 120s tick
    doQuest(p, now); // spends 5; not full, so the timer is NOT reset
    expect(p.energy).toBe(5);
    expect(resourceView(p, "energy", now).secondsToNext).toBe(60); // progress kept
  });

  it("questing from a full pool starts the timer fresh", () => {
    setRngFactory(() => constantRng(0.99));
    const now = 2_000_000;
    const p = createPlayer("R", now); // starts full at 20
    doQuest(p, now);
    expect(p.energy).toBe(15);
    expect(resourceView(p, "energy", now).secondsToNext).toBe(120);
  });
});
