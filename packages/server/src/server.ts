import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { APPARATUS, ECONOMY, ESSENCES, TIERS } from "@cc/engine";
import {
  allPlayers,
  createPlayer,
  deletePlayer,
  getPlayer,
  resetPlayer,
  savePlayer,
  type PlayerState,
} from "./store.js";
import {
  GameError,
  buyApparatus,
  buyEgg,
  claimIdle,
  doQuest,
  doRaid,
  doTransmute,
  gristIncomePerHour,
  pendingIdleGrist,
  regenResources,
  resourceView,
  setBrood,
  setLeader,
  spendSkill,
  vaultDeposit,
  vaultWithdraw,
  type EggType,
} from "./game.js";
import {
  attendanceAvailable,
  attendanceClaim,
  claimMission,
  missionViews,
  rouletteAvailable,
  rouletteSpin,
} from "./daily.js";
import { attackBoss, bossView } from "./worldboss.js";
import { activeEvents, clearEvents, startEvent, type EventType } from "./events.js";
import type { SkillKey } from "./store.js";

const now = () => Date.now();

/** Public projection of player state (everything the client needs). */
function publicState(p: PlayerState) {
  const t = now();
  regenResources(p, t);
  const energy = resourceView(p, "energy", t);
  const stamina = resourceView(p, "stamina", t);
  const hp = resourceView(p, "hp", t);
  const bossAp = resourceView(p, "bossAp", t);
  return {
    id: p.id,
    name: p.name,
    level: p.level,
    xp: p.xp,
    grist: p.grist,
    vaultGrist: p.vaultGrist,
    elixir: p.elixir,
    renown: p.renown,
    reagents: p.reagents,
    residueShards: p.residueShards,
    energy: p.energy,
    stamina: p.stamina,
    hp: p.hp,
    energyMax: energy.max,
    staminaMax: stamina.max,
    hpMax: hp.max,
    bossAp: p.bossAp,
    bossApMax: bossAp.max,
    energyNext: energy.secondsToNext,
    staminaNext: stamina.secondsToNext,
    hpNext: hp.secondsToNext,
    bossApNext: bossAp.secondsToNext,
    skillPoints: p.skillPoints,
    skills: p.skills,
    pity: p.pity,
    attendanceAvailable: attendanceAvailable(p, t),
    rouletteAvailable: rouletteAvailable(p, t),
    apparatus: p.apparatus,
    gristPerHour: gristIncomePerHour(p),
    pendingIdleGrist: pendingIdleGrist(p, t),
    critters: p.critters,
    broodIds: p.broodIds,
    leaderId: p.leaderId,
  };
}

/** Directory holding the exported web app (if built). Override with WEB_DIR. */
function webDir(): string | null {
  const candidates = [
    process.env.WEB_DIR,
    resolve(dirname(fileURLToPath(import.meta.url)), "../public"),
  ].filter(Boolean) as string[];
  return candidates.find((d) => existsSync(join(d, "index.html"))) ?? null;
}

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });

  // Tolerate empty bodies on POSTs that declare application/json (no-body actions).
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
    const text = (body as string).trim();
    if (text === "") return done(null, {});
    try {
      done(null, JSON.parse(text));
    } catch (err) {
      done(err as Error);
    }
  });

  // Allow the web client to call the API (same-origin in prod; permissive otherwise).
  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  // Static catalog (config-as-data the client renders).
  app.get("/catalog", async () => ({
    tiers: TIERS,
    essences: ESSENCES,
    apparatus: APPARATUS,
    apparatusCostGrowth: ECONOMY.apparatusCostGrowth,
    vaultFeeFraction: ECONOMY.vaultFeeFraction,
  }));

  app.post("/players", async (req, reply) => {
    const body = (req.body ?? {}) as { name?: string };
    const p = createPlayer(body.name?.trim() || "Alchemist", now());
    return reply.code(201).send(publicState(p));
  });

  app.get("/players/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const p = getPlayer(id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    return publicState(p);
  });

  app.get("/players", async () =>
    allPlayers().map((p) => ({ id: p.id, name: p.name, level: p.level, isGhost: !!p.isGhost })),
  );

  app.post("/players/:id/claim", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const gained = claimIdle(p, now());
    savePlayer(p);
    return { gained, state: publicState(p) };
  });

  app.post("/players/:id/quest", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    return guard(reply, () => {
      const outcome = doQuest(p, now());
      savePlayer(p);
      return { outcome, state: publicState(p) };
    });
  });

  app.post("/players/:id/transmute", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { a?: string; b?: string; catalyst?: boolean };
    if (!body.a || !body.b) return reply.code(400).send({ error: "Provide critter ids a and b" });
    return guard(reply, () => {
      const outcome = doTransmute(p, body.a!, body.b!, body.catalyst ?? false);
      savePlayer(p);
      return { outcome, state: publicState(p) };
    });
  });

  // Set the fielded brood (and optionally the leader).
  app.post("/players/:id/brood", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { broodIds?: string[]; leaderId?: string };
    if (!Array.isArray(body.broodIds)) return reply.code(400).send({ error: "broodIds required" });
    return guard(reply, () => {
      setBrood(p, body.broodIds!, body.leaderId);
      savePlayer(p);
      return publicState(p);
    });
  });

  // Set the brood leader.
  app.post("/players/:id/leader", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { leaderId?: string };
    if (!body.leaderId) return reply.code(400).send({ error: "leaderId required" });
    return guard(reply, () => {
      setLeader(p, body.leaderId!);
      savePlayer(p);
      return publicState(p);
    });
  });

  // Buy one of an apparatus (idle income building).
  app.post("/players/:id/apparatus", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { apparatusId?: string };
    if (!body.apparatusId) return reply.code(400).send({ error: "apparatusId required" });
    return guard(reply, () => {
      const result = buyApparatus(p, body.apparatusId!);
      savePlayer(p);
      return { result, state: publicState(p) };
    });
  });

  // Spend one skill point on a stat.
  app.post("/players/:id/skill", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { stat?: SkillKey };
    if (!body.stat) return reply.code(400).send({ error: "stat required" });
    return guard(reply, () => {
      spendSkill(p, body.stat!);
      savePlayer(p);
      return publicState(p);
    });
  });

  // Vault: deposit (5% fee) / withdraw (free) to protect Grist from raids.
  app.post("/players/:id/vault/deposit", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { amount?: number };
    return guard(reply, () => {
      const result = vaultDeposit(p, Number(body.amount));
      savePlayer(p);
      return { result, state: publicState(p) };
    });
  });

  app.post("/players/:id/vault/withdraw", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { amount?: number };
    return guard(reply, () => {
      vaultWithdraw(p, Number(body.amount));
      savePlayer(p);
      return publicState(p);
    });
  });

  // Active events (client banner + applied to transmute/quest/boss).
  app.get("/events", async () => activeEvents(now()));

  // Operator controls (require ADMIN_TOKEN env + x-admin-token header).
  app.post("/admin/events", async (req, reply) => {
    if (!requireAdmin(req, reply)) return reply;
    const body = (req.body ?? {}) as { type?: EventType; value?: number; name?: string; hours?: number };
    if (!body.type || body.value == null || !body.hours) {
      return reply.code(400).send({ error: "type, value, hours required" });
    }
    startEvent(body.type, body.value, body.name ?? body.type, body.hours, now());
    return activeEvents(now());
  });

  app.post("/admin/events/clear", async (req, reply) => {
    if (!requireAdmin(req, reply)) return reply;
    clearEvents();
    return [];
  });

  // World Boss — "The Aberration" (shared co-op).
  app.get("/boss", async () => bossView(now()));

  app.post("/players/:id/boss/attack", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { mode?: number };
    return guard(reply, () => {
      const result = attackBoss(p, Number(body.mode ?? 1), now());
      savePlayer(p);
      return { result, state: publicState(p) };
    });
  });

  // Daily loop: missions, attendance, roulette.
  app.get("/players/:id/daily", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const t = now();
    return {
      missions: missionViews(p, t),
      attendanceAvailable: attendanceAvailable(p, t),
      rouletteAvailable: rouletteAvailable(p, t),
      attendanceDay: p.attendance.day,
    };
  });

  app.post("/players/:id/daily/claim", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { missionId?: string };
    if (!body.missionId) return reply.code(400).send({ error: "missionId required" });
    return guard(reply, () => {
      const reward = claimMission(p, body.missionId!, now());
      savePlayer(p);
      return { reward, state: publicState(p) };
    });
  });

  app.post("/players/:id/attendance/claim", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    return guard(reply, () => {
      const result = attendanceClaim(p, now());
      savePlayer(p);
      return { result, state: publicState(p) };
    });
  });

  app.post("/players/:id/roulette/spin", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    return guard(reply, () => {
      const result = rouletteSpin(p, now());
      savePlayer(p);
      return { result, state: publicState(p) };
    });
  });

  // Gacha eggs.
  app.post("/players/:id/egg", async (req, reply) => {
    const p = getPlayer((req.params as { id: string }).id);
    if (!p) return reply.code(404).send({ error: "Player not found" });
    const body = (req.body ?? {}) as { type?: EggType };
    if (!body.type) return reply.code(400).send({ error: "type required" });
    return guard(reply, () => {
      const outcome = buyEgg(p, body.type!);
      savePlayer(p);
      return { outcome, state: publicState(p) };
    });
  });

  // Reset progress back to a fresh starter profile (keeps id + name).
  app.post("/players/:id/reset", async (req, reply) => {
    const reset = resetPlayer((req.params as { id: string }).id, now());
    if (!reset) return reply.code(404).send({ error: "Player not found" });
    return publicState(reset);
  });

  // Permanently delete a profile.
  app.delete("/players/:id", async (req, reply) => {
    const ok = deletePlayer((req.params as { id: string }).id);
    if (!ok) return reply.code(404).send({ error: "Player not found" });
    return reply.code(204).send();
  });

  app.post("/raid", async (req, reply) => {
    const body = (req.body ?? {}) as { attacker?: string; defender?: string };
    const attacker = body.attacker ? getPlayer(body.attacker) : undefined;
    const defender = body.defender ? getPlayer(body.defender) : undefined;
    if (!attacker || !defender) return reply.code(404).send({ error: "Player not found" });
    if (attacker.id === defender.id) return reply.code(400).send({ error: "Cannot raid yourself" });
    return guard(reply, () => {
      const outcome = doRaid(attacker, defender, now());
      savePlayer(attacker);
      savePlayer(defender);
      return { outcome, state: publicState(attacker) };
    });
  });

  // Serve the exported web app (so one URL hosts both the API and the client).
  const web = webDir();
  if (web) {
    app.register(fastifyStatic, { root: web });
    // SPA fallback: serve index.html for unmatched GET routes.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/players") && req.url !== "/health") {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "Not found" });
    });
  }

  return app;
}

function requireAdmin(
  req: import("fastify").FastifyRequest,
  reply: import("fastify").FastifyReply,
): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    reply.code(403).send({ error: "Admin disabled — set ADMIN_TOKEN" });
    return false;
  }
  if (req.headers["x-admin-token"] !== token) {
    reply.code(401).send({ error: "Bad admin token" });
    return false;
  }
  return true;
}

function guard<T>(reply: import("fastify").FastifyReply, fn: () => T) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GameError) return reply.code(409).send({ error: e.message });
    throw e;
  }
}
