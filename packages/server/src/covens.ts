import { randomUUID } from "node:crypto";
import { broodTotals, critterStats, type Critter } from "@cc/engine";
import { dbCovenDelete, dbCovenLoadAll, dbCovenUpsert } from "./db.js";
import { GameError } from "./errors.js";
import { applyReward, type Reward } from "./daily.js";
import { getPlayer, savePlayer, type PlayerState } from "./store.js";

export interface CovenBoss {
  hp: number;
  maxHp: number;
  summonedAt: number;
  expiresAt: number;
  damage: Record<string, number>;
}

export interface Coven {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  memberIds: string[];
  boss: CovenBoss | null;
  createdTs: number;
}

const MAX_MEMBERS = 12;
const CREATE_COST = 1000; // Grist (this is the real gate)
const MIN_LEVEL = 1;
const SUMMON_GRIST = 2000;
const SUMMON_REAGENTS = 1;
const DAY = 24 * 3600 * 1000;

const covens = new Map<string, Coven>();
for (const c of dbCovenLoadAll<Coven>()) covens.set(c.id, c);

function save(c: Coven): void {
  covens.set(c.id, c);
  dbCovenUpsert(c.id, c);
}

export function getCoven(id: string | undefined): Coven | undefined {
  return id ? covens.get(id) : undefined;
}

export function allCovens(): Coven[] {
  return [...covens.values()];
}

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return getCovenByCode(code) ? genCode() : code;
}

export function getCovenByCode(code: string): Coven | undefined {
  const norm = code.trim().toUpperCase();
  return [...covens.values()].find((c) => c.code === norm);
}

export function covenmateCount(p: PlayerState): number {
  const c = getCoven(p.covenId);
  return c ? Math.max(0, c.memberIds.length - 1) : 0;
}

export function createCoven(p: PlayerState, name: string, now: number): Coven {
  if (p.covenId) throw new GameError("You're already in a coven");
  if (p.level < MIN_LEVEL) throw new GameError(`Reach level ${MIN_LEVEL} to found a coven`);
  if (p.grist < CREATE_COST) throw new GameError(`Founding a coven costs ${CREATE_COST} Grist`);
  const clean = name.trim().slice(0, 24) || "New Coven";
  p.grist -= CREATE_COST;
  const coven: Coven = {
    id: randomUUID(),
    name: clean,
    code: genCode(),
    leaderId: p.id,
    memberIds: [p.id],
    boss: null,
    createdTs: now,
  };
  p.covenId = coven.id;
  save(coven);
  savePlayer(p);
  return coven;
}

export function joinCoven(p: PlayerState, code: string, now: number): Coven {
  if (p.covenId) throw new GameError("Leave your current coven first");
  const coven = getCovenByCode(code);
  if (!coven) throw new GameError("No coven with that code");
  if (coven.memberIds.length >= MAX_MEMBERS) throw new GameError("That coven is full");
  coven.memberIds.push(p.id);
  p.covenId = coven.id;
  save(coven);
  savePlayer(p);
  return coven;
}

export function leaveCoven(p: PlayerState): void {
  const coven = getCoven(p.covenId);
  p.covenId = undefined;
  savePlayer(p);
  if (!coven) return;
  coven.memberIds = coven.memberIds.filter((id) => id !== p.id);
  if (coven.memberIds.length === 0) {
    covens.delete(coven.id);
    dbCovenDelete(coven.id);
    return;
  }
  if (coven.leaderId === p.id) coven.leaderId = coven.memberIds[0]!;
  save(coven);
}

// --- Homunculus (coven boss) ---

export function summonHomunculus(p: PlayerState, now: number): Coven {
  const coven = getCoven(p.covenId);
  if (!coven) throw new GameError("Join a coven first");
  if (coven.boss && now < coven.boss.expiresAt && coven.boss.hp > 0) {
    throw new GameError("A Homunculus is already loose");
  }
  if (p.grist < SUMMON_GRIST) throw new GameError(`Summoning costs ${SUMMON_GRIST} Grist`);
  if (p.reagents < SUMMON_REAGENTS) throw new GameError("Summoning needs 1 Reagent");
  p.grist -= SUMMON_GRIST;
  p.reagents -= SUMMON_REAGENTS;
  const maxHp = 50000 + 20000 * (coven.memberIds.length - 1);
  coven.boss = { hp: maxHp, maxHp, summonedAt: now, expiresAt: now + DAY, damage: {} };
  save(coven);
  savePlayer(p);
  return coven;
}

export interface HomunculusAttackResult {
  damage: number;
  bossHp: number;
  bossMaxHp: number;
  defeated: boolean;
  reward?: Reward;
}

export function attackHomunculus(p: PlayerState, now: number): HomunculusAttackResult {
  const coven = getCoven(p.covenId);
  if (!coven || !coven.boss) throw new GameError("No Homunculus to fight — summon one");
  if (now >= coven.boss.expiresAt) throw new GameError("The Homunculus has fled");
  if (p.stamina < 1) throw new GameError("Not enough Stamina");
  p.stamina -= 1;
  p.staminaTs = now;

  const brood = p.critters.filter((c: Critter) => p.broodIds.includes(c.id));
  const leader = p.critters.find((c) => c.id === p.leaderId);
  const atk = broodTotals(brood, leader).atk + (p.skills?.attack ?? 0);
  const damage = Math.max(1, atk);
  const boss = coven.boss;
  boss.hp -= damage;
  boss.damage[p.id] = (boss.damage[p.id] ?? 0) + damage;

  let defeated = false;
  let reward: Reward | undefined;
  if (boss.hp <= 0) {
    defeated = true;
    reward = distribute(boss, p.id);
    coven.boss = null;
  }
  save(coven);
  savePlayer(p);
  return { damage, bossHp: Math.max(0, boss.hp), bossMaxHp: boss.maxHp, defeated, reward };
}

function distribute(boss: CovenBoss, selfId: string): Reward | undefined {
  const gristPool = boss.maxHp; // generous: roughly your damage back as Grist
  const elixirPool = 20;
  let self: Reward | undefined;
  for (const [pid, dmg] of Object.entries(boss.damage)) {
    const player = getPlayer(pid);
    if (!player) continue;
    const share = dmg / boss.maxHp;
    const reward: Reward = {
      grist: Math.round(share * gristPool),
      elixir: Math.max(1, Math.round(share * elixirPool)),
      reagents: 1,
    };
    applyReward(player, reward);
    savePlayer(player);
    if (pid === selfId) self = reward;
  }
  return self;
}

export interface CovenView {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  members: { id: string; name: string; level: number; power: number }[];
  boss: { hp: number; maxHp: number; expiresAt: number } | null;
}

export function covenView(coven: Coven): CovenView {
  const members = coven.memberIds.map((id) => {
    const m = getPlayer(id);
    const brood = m ? m.critters.filter((c) => m.broodIds.includes(c.id)) : [];
    const power = brood.reduce((acc, c) => {
      const s = critterStats(c);
      return acc + s.atk + s.def;
    }, 0);
    return { id, name: m?.name ?? "?", level: m?.level ?? 0, power };
  });
  return {
    id: coven.id,
    name: coven.name,
    code: coven.code,
    leaderId: coven.leaderId,
    members,
    boss: coven.boss ? { hp: coven.boss.hp, maxHp: coven.boss.maxHp, expiresAt: coven.boss.expiresAt } : null,
  };
}
