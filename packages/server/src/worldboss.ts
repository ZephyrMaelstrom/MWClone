import { broodTotals, type Tier } from "@cc/engine";
import { dbGetMeta, dbSetMeta } from "./db.js";
import { GameError } from "./errors.js";
import { cap, regenResources } from "./game.js";
import { applyReward, recordDaily, type Reward } from "./daily.js";
import { bossDamageMultiplier } from "./events.js";
import { getPlayer, savePlayer, type PlayerState } from "./store.js";

export interface WorldBoss {
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  spawnedAt: number;
  expiresAt: number;
  damage: Record<string, number>; // playerId -> total damage
}

const KEY = "worldBoss";
const DAY = 24 * 3600 * 1000;

/** Attack modes: bigger multiplier is more AP-efficient (rewards saving AP). */
const MODES: Record<string, { ap: number; mult: number }> = {
  "1": { ap: 1, mult: 1 },
  "10": { ap: 4, mult: 10 },
  "50": { ap: 10, mult: 50 },
};

function spawn(level: number, now: number): WorldBoss {
  return {
    name: "The Aberration",
    level,
    maxHp: 30000 * level,
    hp: 30000 * level,
    spawnedAt: now,
    expiresAt: now + DAY,
    damage: {},
  };
}

/** Current boss; spawns a fresh one if none exists or the last one fled (expired). */
export function getBoss(now: number): WorldBoss {
  let b = dbGetMeta<WorldBoss>(KEY);
  if (!b) {
    b = spawn(1, now);
    dbSetMeta(KEY, b);
  } else if (now > b.expiresAt) {
    b = spawn(b.level, now); // it fled — respawn at the same level, no rewards
    dbSetMeta(KEY, b);
  }
  return b;
}

export interface BossView {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  expiresAt: number;
  topDamagers: { name: string; damage: number }[];
}

export function bossView(now: number): BossView {
  const b = getBoss(now);
  const top = Object.entries(b.damage)
    .sort((a, c) => c[1] - a[1])
    .slice(0, 5)
    .map(([pid, damage]) => ({ name: getPlayer(pid)?.name ?? "?", damage }));
  return { name: b.name, level: b.level, hp: b.hp, maxHp: b.maxHp, expiresAt: b.expiresAt, topDamagers: top };
}

export interface BossAttackResult {
  damage: number;
  bossHp: number;
  bossMaxHp: number;
  bossLevel: number;
  defeated: boolean;
  reward?: Reward;
}

export function attackBoss(p: PlayerState, mode: number, now: number): BossAttackResult {
  const m = MODES[String(mode)];
  if (!m) throw new GameError("Invalid attack mode");
  regenResources(p, now);
  if (p.bossAp < m.ap) throw new GameError("Not enough Boss AP");
  const wasFull = p.bossAp >= cap(p, "bossAp");
  p.bossAp -= m.ap;
  if (wasFull) p.bossApTs = now;

  const b = getBoss(now);
  const brood = p.critters.filter((c) => p.broodIds.includes(c.id));
  const leader = p.critters.find((c) => c.id === p.leaderId);
  const atk = broodTotals(brood, leader).atk + (p.skills?.attack ?? 0);
  const damage = Math.max(1, Math.round(atk * m.mult * bossDamageMultiplier(now)));

  b.hp -= damage;
  b.damage[p.id] = (b.damage[p.id] ?? 0) + damage;
  p.bossDamageTotal = (p.bossDamageTotal ?? 0) + damage;
  recordDaily(p, "bossHits", now);

  let defeated = false;
  let reward: Reward | undefined;
  if (b.hp <= 0) {
    defeated = true;
    reward = distribute(b, p.id, now);
    dbSetMeta(KEY, spawn(b.level + 1, now)); // next, tougher boss
  } else {
    dbSetMeta(KEY, b);
  }

  return {
    damage,
    bossHp: Math.max(0, b.hp),
    bossMaxHp: b.maxHp,
    bossLevel: b.level,
    defeated,
    reward,
  };
}

/** Credit every participant by damage share; return the attacker's reward. */
function distribute(b: WorldBoss, selfId: string, now: number): Reward | undefined {
  const gristPool = 8000 * b.level;
  const elixirPool = 10 + 3 * b.level;
  let topId = selfId;
  let topDmg = -1;
  for (const [pid, dmg] of Object.entries(b.damage)) {
    if (dmg > topDmg) {
      topDmg = dmg;
      topId = pid;
    }
  }
  let selfReward: Reward | undefined;
  for (const [pid, dmg] of Object.entries(b.damage)) {
    const player = getPlayer(pid);
    if (!player) continue;
    const share = dmg / b.maxHp;
    const reward: Reward = {
      grist: Math.round(share * gristPool),
      elixir: Math.max(1, Math.round(share * elixirPool)),
    };
    if (pid === topId) {
      reward.reagents = 1;
      reward.elixir = (reward.elixir ?? 0) + 5;
      reward.critterTier = Math.min(8, b.level + 3) as Tier;
    }
    applyReward(player, reward);
    savePlayer(player);
    if (pid === selfId) selfReward = reward;
  }
  return selfReward;
}
