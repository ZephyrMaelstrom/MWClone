import { beforeEach, describe, expect, it } from "vitest";
import { constantRng } from "@cc/engine";
import { createPlayer, newCritter, resetStore } from "../src/store.js";
import { doQuest, doTransmute, setRngFactory } from "../src/game.js";
import {
  activeEvents,
  bossDamageMultiplier,
  clearEvents,
  mergeSuccessBonus,
  questGristMultiplier,
  startEvent,
} from "../src/events.js";

beforeEach(() => {
  resetStore();
  clearEvents();
});

describe("events lifecycle", () => {
  it("activates within its window and expires after", () => {
    const now = 1_000_000;
    startEvent("merge_success", 0.2, "Merge Frenzy", 24, now);
    expect(activeEvents(now).length).toBe(1);
    expect(mergeSuccessBonus(now)).toBeCloseTo(0.2, 5);
    expect(mergeSuccessBonus(now + 25 * 3600 * 1000)).toBe(0); // expired
  });

  it("caps the merge success bonus at 0.4", () => {
    const now = 1_000_000;
    startEvent("merge_success", 0.3, "A", 24, now);
    startEvent("merge_success", 0.3, "B", 24, now);
    expect(mergeSuccessBonus(now)).toBe(0.4);
  });

  it("exposes quest grist and boss damage multipliers", () => {
    const now = 1_000_000;
    startEvent("double_grist", 2, "Double Grist", 24, now);
    startEvent("boss_frenzy", 2, "Frenzy", 24, now);
    expect(questGristMultiplier(now)).toBe(2);
    expect(bossDamageMultiplier(now)).toBe(2);
  });
});

describe("events affect gameplay", () => {
  it("a Merge Event raises transmute success", () => {
    setRngFactory(() => constantRng(0.5)); // between Gold base 0.45 and boosted 0.65
    const now = Date.now();
    const p = createPlayer("E", now);
    p.grist = 1_000_000_000;
    // two Gold (tier 8) inputs -> result tier 9 (base 0.45)
    const a = newCritter(8, "ember");
    const b = newCritter(8, "ember");
    p.critters.push(a, b);

    // Without an event: roll 0.5 > 0.45 -> fail
    expect(doTransmute(p, a.id, b.id, false).success).toBe(false);

    const c = newCritter(8, "ember");
    const d = newCritter(8, "ember");
    p.critters.push(c, d);
    startEvent("merge_success", 0.2, "Merge Frenzy", 24, now); // 0.45 + 0.2 = 0.65
    expect(doTransmute(p, c.id, d.id, false).success).toBe(true);
  });

  it("a Double Grist event doubles quest Grist", () => {
    setRngFactory(() => constantRng(0)); // grist = 200 (min)
    const now = Date.now();
    const p = createPlayer("E", now);
    startEvent("double_grist", 2, "Double Grist", 24, now);
    const out = doQuest(p, now);
    expect(out.gristGained).toBe(400);
  });
});
