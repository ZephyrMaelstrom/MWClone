import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { ESSENCES, TIERS } from "@cc/engine";
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
  claimIdle,
  doQuest,
  doRaid,
  doTransmute,
  pendingIdleGrist,
  regenResources,
} from "./game.js";

const now = () => Date.now();

/** Public projection of player state (everything the client needs). */
function publicState(p: PlayerState) {
  regenResources(p, now());
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
    skillPoints: p.skillPoints,
    apparatus: p.apparatus,
    pendingIdleGrist: pendingIdleGrist(p, now()),
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

  // Allow the web client to call the API (same-origin in prod; permissive otherwise).
  app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  // Static catalog (config-as-data the client renders).
  app.get("/catalog", async () => ({ tiers: TIERS, essences: ESSENCES }));

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
    allPlayers().map((p) => ({ id: p.id, name: p.name, level: p.level })),
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

function guard<T>(reply: import("fastify").FastifyReply, fn: () => T) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof GameError) return reply.code(409).send({ error: e.message });
    throw e;
  }
}
