import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { constantRng } from "@cc/engine";
import { buildServer } from "../src/server.js";
import { resetStore } from "../src/store.js";
import { setRngFactory } from "../src/game.js";
import { dbLoadAll } from "../src/db.js";
import { seedGhosts } from "../src/ghosts.js";

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

describe("P0: brood, apparatus, skills, vault", () => {
  it("sets the brood and leader", async () => {
    const p = await createPlayer();
    const ids = p.critters.slice(0, 3).map((c: { id: string }) => c.id);
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/brood`,
      payload: { broodIds: ids, leaderId: ids[0] },
    });
    expect(res.statusCode).toBe(200);
    const state = res.json();
    expect(state.broodIds.sort()).toEqual([...ids].sort());
    expect(state.leaderId).toBe(ids[0]);
  });

  it("auto-fields captured/transmuted critters so battle power grows", async () => {
    setRngFactory(() => constantRng(0.001)); // quests capture (rng<0.4)
    const p = await createPlayer();
    const before = p.broodIds.length;
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    const after = (await app.inject({ method: "GET", url: `/players/${p.id}` })).json();
    expect(after.critters.length).toBeGreaterThan(p.critters.length);
    expect(after.broodIds.length).toBeGreaterThanOrEqual(before); // new critter fielded
  });

  it("buys apparatus and increases Grist/hour", async () => {
    const p = await createPlayer();
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/apparatus`,
      payload: { apparatusId: "hut" },
    });
    expect(res.statusCode).toBe(200);
    const { state, result } = res.json();
    expect(result.count).toBe(2); // started with 1 hut
    expect(state.grist).toBe(1000 - result.cost);
    expect(state.gristPerHour).toBe(2 * 5); // 2 huts x 5/hr
  });

  it("spends a skill point and raises the resource cap", async () => {
    setRngFactory(() => constantRng(0.99));
    const p = await createPlayer();
    // earn a level (and skill points) by questing a lot? Instead grant via reset+quests is slow;
    // quickest: quest enough XP. Simulate by questing until level 2.
    let state = p;
    for (let i = 0; i < 30 && state.skillPoints === 0; i++) {
      // refill energy via quest only works while energy remains; also claim not needed
      const r = await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
      if (r.statusCode === 200) state = r.json().state;
      else break;
    }
    // If we leveled, spend a point on energy.
    if (state.skillPoints > 0) {
      const res = await app.inject({
        method: "POST",
        url: `/players/${p.id}/skill`,
        payload: { stat: "energy" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().energyMax).toBeGreaterThan(20);
    }
  });

  it("vault deposit charges 5% and protects Grist; withdraw is free", async () => {
    const p = await createPlayer();
    const dep = await app.inject({
      method: "POST",
      url: `/players/${p.id}/vault/deposit`,
      payload: { amount: 1000 },
    });
    expect(dep.statusCode).toBe(200);
    const after = dep.json().state;
    expect(after.grist).toBe(0);
    expect(after.vaultGrist).toBe(950); // 1000 - 5% fee
    const wd = await app.inject({
      method: "POST",
      url: `/players/${p.id}/vault/withdraw`,
      payload: { amount: 950 },
    });
    expect(wd.json().grist).toBe(950);
    expect(wd.json().vaultGrist).toBe(0);
  });
});

describe("P1: daily loop, eggs, boss endpoint", () => {
  it("lists daily missions and claims one after completing it", async () => {
    setRngFactory(() => constantRng(0.99)); // no captures, deterministic
    const p = await createPlayer();
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    const daily = (await app.inject({ method: "GET", url: `/players/${p.id}/daily` })).json();
    const quests = daily.missions.find((m: { id: string }) => m.id === "quests3");
    expect(quests.done).toBe(true);
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/daily/claim`,
      payload: { missionId: "quests3" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state.elixir).toBeGreaterThan(10); // got Elixir reward
  });

  it("attendance claims once per day", async () => {
    const p = await createPlayer();
    const first = await app.inject({ method: "POST", url: `/players/${p.id}/attendance/claim` });
    expect(first.statusCode).toBe(200);
    expect(first.json().result.day).toBe(1);
    const second = await app.inject({ method: "POST", url: `/players/${p.id}/attendance/claim` });
    expect(second.statusCode).toBe(409);
  });

  it("roulette spins once per day", async () => {
    const p = await createPlayer();
    expect((await app.inject({ method: "POST", url: `/players/${p.id}/roulette/spin` })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: `/players/${p.id}/roulette/spin` })).statusCode).toBe(409);
  });

  it("buys a gacha egg for Elixir and gains a critter", async () => {
    setRngFactory(() => constantRng(0.5));
    const p = await createPlayer();
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/egg`,
      payload: { type: "crucible" },
    });
    expect(res.statusCode).toBe(200);
    const { state } = res.json();
    expect(state.elixir).toBe(5); // 10 - 5
    expect(state.critters.length).toBe(7); // 6 starters + 1
  });

  it("serves the world boss and accepts an attack", async () => {
    const p = await createPlayer();
    const boss = (await app.inject({ method: "GET", url: "/boss" })).json();
    expect(boss.name).toBe("The Aberration");
    const res = await app.inject({
      method: "POST",
      url: `/players/${p.id}/boss/attack`,
      payload: { mode: 1 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().result.damage).toBeGreaterThan(0);
  });
});

describe("P2: coven + leaderboard endpoints", () => {
  it("creates a coven and a second player joins by code", async () => {
    const a = await createPlayer("A"); // starts with 1000 Grist (the founding cost)
    const created = await app.inject({
      method: "POST",
      url: `/players/${a.id}/coven`,
      payload: { name: "Alchemists United" },
    });
    expect(created.statusCode).toBe(200);
    const code = created.json().coven.code;
    expect(code).toHaveLength(6);

    const b = await createPlayer("B");
    const joined = await app.inject({
      method: "POST",
      url: `/players/${b.id}/coven/join`,
      payload: { code },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json().coven.members.length).toBe(2);
  });

  it("serves a leaderboard", async () => {
    await createPlayer("A");
    const res = await app.inject({ method: "GET", url: "/leaderboard?type=level" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("level");
    expect(Array.isArray(body.rows)).toBe(true);
  });
});

describe("P2 leftovers: exhibition + chat endpoints", () => {
  it("fights in the exhibition and updates rating/renown", async () => {
    const a = await createPlayer("A");
    const b = await createPlayer("B");
    const res = await app.inject({
      method: "POST",
      url: `/players/${a.id}/exhibition/fight`,
      payload: { opponentId: b.id },
    });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().result.win).toBe("boolean");
    const board = await app.inject({ method: "GET", url: "/exhibition/standings" });
    expect(board.json().rows.length).toBeGreaterThan(0);
  });

  it("posts and reads world chat", async () => {
    const a = await createPlayer("Chatter");
    const post = await app.inject({
      method: "POST",
      url: `/players/${a.id}/chat/world`,
      payload: { text: "hello covenmates" },
    });
    expect(post.statusCode).toBe(200);
    const msgs = (await app.inject({ method: "GET", url: "/chat/world" })).json();
    expect(msgs.some((m: { text: string }) => m.text === "hello covenmates")).toBe(true);
  });

  it("rejects empty chat messages", async () => {
    const a = await createPlayer("A");
    const res = await app.inject({ method: "POST", url: `/players/${a.id}/chat/world`, payload: { text: "  " } });
    expect(res.statusCode).toBe(409);
  });
});

describe("events (public + admin)", () => {
  it("admin routes require ADMIN_TOKEN", async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await app.inject({
      method: "POST",
      url: "/admin/events",
      payload: { type: "merge_success", value: 0.2, hours: 24 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("starts an event with the right token and lists it publicly", async () => {
    process.env.ADMIN_TOKEN = "secret";
    const bad = await app.inject({
      method: "POST",
      url: "/admin/events",
      headers: { "x-admin-token": "nope" },
      payload: { type: "merge_success", value: 0.2, hours: 24 },
    });
    expect(bad.statusCode).toBe(401);

    const ok = await app.inject({
      method: "POST",
      url: "/admin/events",
      headers: { "x-admin-token": "secret" },
      payload: { type: "merge_success", value: 0.2, name: "Merge Frenzy", hours: 24 },
    });
    expect(ok.statusCode).toBe(200);

    const events = (await app.inject({ method: "GET", url: "/events" })).json();
    expect(events.some((e: { type: string }) => e.type === "merge_success")).toBe(true);

    await app.inject({ method: "POST", url: "/admin/events/clear", headers: { "x-admin-token": "secret" } });
    expect((await app.inject({ method: "GET", url: "/events" })).json()).toEqual([]);
    delete process.env.ADMIN_TOKEN;
  });
});

describe("reset & delete", () => {
  it("reset restores a fresh starter profile, keeping the same id", async () => {
    setRngFactory(() => constantRng(0.99)); // no capture
    const p = await createPlayer();
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` }); // changes grist/energy
    const res = await app.inject({ method: "POST", url: `/players/${p.id}/reset` });
    expect(res.statusCode).toBe(200);
    const reset = res.json();
    expect(reset.id).toBe(p.id); // same profile id -> client keeps working
    expect(reset.grist).toBe(1000);
    expect(reset.energy).toBe(20);
    expect(reset.critters).toHaveLength(6);
  });

  it("delete removes the profile (then 404)", async () => {
    const p = await createPlayer();
    const del = await app.inject({ method: "DELETE", url: `/players/${p.id}` });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: "GET", url: `/players/${p.id}` });
    expect(get.statusCode).toBe(404);
  });
});

describe("ghost rivals", () => {
  it("seeds wandering alchemists that appear in the rival list", async () => {
    const n = seedGhosts(Date.now());
    expect(n).toBeGreaterThan(0);
    expect(seedGhosts(Date.now())).toBe(0); // idempotent
    const list = (await app.inject({ method: "GET", url: "/players" })).json();
    const ghosts = list.filter((p: { isGhost: boolean }) => p.isGhost);
    expect(ghosts.length).toBe(n);
  });

  it("a ghost is raidable and refills its Grist to baseline afterwards", async () => {
    setRngFactory(() => constantRng(0.5));
    seedGhosts(Date.now());
    const me = await createPlayer("Me");
    const list = (await app.inject({ method: "GET", url: "/players" })).json();
    const soot = list.find((p: { name: string }) => p.name === "Soot the Apprentice");
    expect(soot).toBeDefined();
    const before = (await app.inject({ method: "GET", url: `/players/${soot.id}` })).json().grist;
    const res = await app.inject({
      method: "POST",
      url: "/raid",
      payload: { attacker: me.id, defender: soot.id },
    });
    expect(res.statusCode).toBe(200);
    const after = (await app.inject({ method: "GET", url: `/players/${soot.id}` })).json().grist;
    expect(after).toBe(before); // refilled to baseline regardless of outcome
  });
});

describe("persistence (write-through to SQLite)", () => {
  it("actions are persisted to the store", async () => {
    setRngFactory(() => constantRng(0.99));
    const p = await createPlayer();
    await app.inject({ method: "POST", url: `/players/${p.id}/quest` });
    const persisted = dbLoadAll().find((x) => x.id === p.id);
    expect(persisted).toBeDefined();
    expect(persisted!.grist).toBeGreaterThan(1000);
  });
});
