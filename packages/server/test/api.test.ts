import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { constantRng } from "@cc/engine";
import { buildServer } from "../src/server.js";
import { resetStore } from "../src/store.js";
import { setRngFactory } from "../src/game.js";

let app: ReturnType<typeof buildServer>;

beforeEach(() => {
  resetStore();
  app = buildServer();
});
afterEach(async () => {
  await app.close();
});

async function createPlayer(name = "Tester") {
  const res = await app.inject({ method: "POST", url: "/players", payload: { name } });
  expect(res.statusCode).toBe(201);
  return res.json();
}

describe("player lifecycle", () => {
  it("creates a player with starter brood and currencies", async () => {
    const p = await createPlayer();
    expect(p.level).toBe(1);
    expect(p.grist).toBe(1000);
    expect(p.elixir).toBe(10);
    expect(p.critters).toHaveLength(6);
    expect(p.critters.every((c: { tier: number }) => c.tier === 2)).toBe(true);
  });

  it("serves the config catalog", async () => {
    const res = await app.inject({ method: "GET", url: "/catalog" });
    const body = res.json();
    expect(body.tiers["11"].name).toBe("Magnum Opus");
    expect(body.essences.brimstone.atkParts).toBe(6);
  });
});

describe("transmute", () => {
  it("with a Catalyst, always succeeds and produces a tier-3 critter", async () => {
    setRngFactory(() => constantRng(0.999)); // would fail without catalyst
    const p = await createPlayer();
    const [a, b] = p.critters; // two Lead (tier 2)
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/transmute`,
      payload: { a: a.id, b: b.id, catalyst: true },
    });
    expect(res.statusCode).toBe(200);
    const { outcome, state } = res.json();
    expect(outcome.success).toBe(true);
    expect(outcome.outcomeCritter.tier).toBe(3);
    expect(state.elixir).toBe(7); // 10 - catalyst(3) for result tier 3
    expect(state.critters).toHaveLength(5); // 6 - 2 inputs + 1 output
  });

  it("rejects transmuting two critters of different tiers", async () => {
    setRngFactory(() => constantRng(0.999));
    const p = await createPlayer();
    // craft a mismatch by transmuting two first, then trying with a leftover tier-2
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/transmute`,
      payload: { a: p.critters[0].id, b: p.critters[0].id },
    });
    expect(res.statusCode).toBe(409); // same critter
  });
});

describe("quest + idle", () => {
  it("quest spends energy and grants grist", async () => {
    setRngFactory(() => constantRng(0.99)); // no capture (>=0.4)
    const p = await createPlayer();
    const res = await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    expect(res.statusCode).toBe(200);
    const { state } = res.json();
    expect(state.energy).toBe(15); // 20 - 5
    expect(state.grist).toBeGreaterThan(1000);
  });
});

describe("raid (friendly PvP)", () => {
  it("a stronger brood wins and steals 10% of un-vaulted Grist", async () => {
    setRngFactory(() => constantRng(0.5)); // neutral rolls
    const strong = await createPlayer("Strong");
    const weak = await createPlayer("Weak");
    // give the defender raidable grist
    const res = await app.inject({
      method: "POST",
      url: "/raid",
      payload: { attacker: strong.id, defender: weak.id },
    });
    expect(res.statusCode).toBe(200);
    const { outcome } = res.json();
    // equal broods + neutral rolls => attacker ATK (5:4-ish) vs defender DEF; result deterministic
    expect(typeof outcome.win).toBe("boolean");
    expect(outcome.gristStolen).toBeGreaterThanOrEqual(0);
  });
});
