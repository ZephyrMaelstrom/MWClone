import {
  type Critter,
  type Rng,
  type Tier,
  APPARATUS,
  apparatusCost,
  broodTotals,
  canTransmute,
  catalystCost,
  critterStats,
  gristCost,
  gristPerHour,
  maxFielded,
  mulberry32,
  offlineGrist,
  raidSteal,
  resolveRaid,
  resourceCap,
  regenPoints,
  RESOURCES,
  transmute,
  vaultFee,
  xpForLevel,
  PROGRESSION,
} from "@cc/engine";
import { ESSENCE_IDS } from "@cc/engine";
import { type PlayerState, type SkillKey, newCritter } from "./store.js";
import { GameError } from "./errors.js";
import { recordDaily } from "./daily.js";
import { mergeSuccessBonus, questGristMultiplier } from "./events.js";
import { covenmateCount } from "./covens.js";

export { GameError };

/** Server-side RNG (fresh sequence per action). Override in tests for determinism. */
let rngFactory: () => Rng = () => mulberry32((Math.random() * 2 ** 32) >>> 0);
export function setRngFactory(f: () => Rng): void {
  rngFactory = f;
}

export type RegenKey = "energy" | "stamina" | "hp" | "bossAp";

/** Effective cap for a regenerating resource = base(level) + skill points spent. */
export function cap(p: PlayerState, key: RegenKey): number {
  const skillBonus = key === "bossAp" ? 0 : (p.skills?.[key] ?? 0);
  return resourceCap(key, p.level) + skillBonus;
}

/** Apply pending resource regen up to cap, mutating the player. */
export function regenResources(p: PlayerState, now: number): void {
  for (const key of ["energy", "stamina", "hp", "bossAp"] as const) {
    const tsKey = `${key}Ts` as const;
    const c = cap(p, key);
    const elapsed = Math.max(0, now - p[tsKey]);
    const gained = regenPoints(key, Math.floor(elapsed / 1000));
    if (gained > 0 && p[key] < c) {
      p[key] = Math.min(c, p[key] + gained);
      p[tsKey] = p[tsKey] + gained * RESOURCES[key].secondsPerPoint * 1000;
    }
    if (p[key] >= c) p[tsKey] = now;
  }
}

/** Current value, cap, and seconds until the next +1 for a regenerating resource. */
export function resourceView(
  p: PlayerState,
  key: RegenKey,
  now: number,
): { value: number; max: number; secondsToNext: number } {
  const max = cap(p, key);
  const value = p[key];
  let secondsToNext = 0;
  if (value < max) {
    const sec = RESOURCES[key].secondsPerPoint;
    const elapsed = Math.max(0, Math.floor((now - p[`${key}Ts`]) / 1000));
    secondsToNext = sec - (elapsed % sec);
  }
  return { value, max, secondsToNext };
}

export function pendingIdleGrist(p: PlayerState, now: number): number {
  return offlineGrist(gristPerHour(p.apparatus), Math.floor((now - p.lastClaimTs) / 1000));
}

export function gristIncomePerHour(p: PlayerState): number {
  return gristPerHour(p.apparatus);
}

export function claimIdle(p: PlayerState, now: number): number {
  const amount = pendingIdleGrist(p, now);
  p.grist += amount;
  p.lastClaimTs = now;
  return amount;
}

function grantXp(p: PlayerState, xp: number): void {
  p.xp += xp;
  while (p.xp >= xpForLevel(p.level + 1)) {
    p.level += 1;
    p.skillPoints += PROGRESSION.skillPointsPerLevel;
    p.energy = cap(p, "energy");
    p.stamina = cap(p, "stamina");
    p.hp = cap(p, "hp");
  }
}

// ---------------------------------------------------------------------------
// Brood & leader
// ---------------------------------------------------------------------------

const power = (c: Critter) => {
  const s = critterStats(c);
  return s.atk + s.def;
};

/** Fill empty brood slots with your strongest un-fielded critters. */
export function autoField(p: PlayerState): void {
  const max = maxFielded(p.level, covenmateCount(p));
  const inBrood = new Set(p.broodIds);
  const candidates = p.critters
    .filter((c) => !inBrood.has(c.id))
    .sort((a, b) => power(b) - power(a));
  for (const c of candidates) {
    if (p.broodIds.length >= max) break;
    p.broodIds.push(c.id);
  }
}

/** Ensure the leader is a fielded critter (default: strongest fielded). */
export function ensureLeader(p: PlayerState): void {
  if (p.leaderId && p.broodIds.includes(p.leaderId)) return;
  const brood = p.critters.filter((c) => p.broodIds.includes(c.id)).sort((a, b) => power(b) - power(a));
  p.leaderId = brood[0]?.id;
}

/** Manually set the fielded brood (and optionally the leader). */
export function setBrood(p: PlayerState, broodIds: string[], leaderId?: string): void {
  const owned = new Set(p.critters.map((c) => c.id));
  const valid = broodIds.filter((id) => owned.has(id));
  const max = maxFielded(p.level, covenmateCount(p));
  if (valid.length > max) throw new GameError(`Your brood can hold at most ${max} critters`);
  p.broodIds = [...new Set(valid)];
  if (leaderId && p.broodIds.includes(leaderId)) p.leaderId = leaderId;
  ensureLeader(p);
}

export function setLeader(p: PlayerState, leaderId: string): void {
  if (!p.broodIds.includes(leaderId)) throw new GameError("Leader must be a fielded critter");
  p.leaderId = leaderId;
}

// ---------------------------------------------------------------------------
// Transmute
// ---------------------------------------------------------------------------

export interface TransmuteOutcome {
  success: boolean;
  outcomeCritter?: Critter;
  slagCritter?: Critter;
  gristSpent: number;
  elixirSpent: number;
  shardsGained: number;
  successRateUsed: number;
}

export function doTransmute(
  p: PlayerState,
  critterAId: string,
  critterBId: string,
  catalyst: boolean,
): TransmuteOutcome {
  if (critterAId === critterBId) throw new GameError("Pick two different critters");
  const a = p.critters.find((c) => c.id === critterAId);
  const b = p.critters.find((c) => c.id === critterBId);
  if (!a || !b) throw new GameError("Critter not owned");
  if (a.tier !== b.tier) throw new GameError("Critters must share a tier");
  if (!canTransmute(a.tier)) throw new GameError(`Tier ${a.tier} cannot be transmuted`);

  const resultTier = (a.tier + 1) as Tier;
  const grist = gristCost(resultTier);
  const elixir = catalyst ? catalystCost(resultTier) : 0;
  if (p.grist < grist) throw new GameError("Not enough Grist");
  if (p.elixir < elixir) throw new GameError("Not enough Elixir");

  const result = transmute(
    { tier: a.tier, essenceA: a.essence, essenceB: b.essence, gradeA: a.grade, gradeB: b.grade },
    { catalyst, successBonus: mergeSuccessBonus(Date.now()) },
    rngFactory(),
  );

  p.grist -= grist;
  p.elixir -= elixir;
  removeCritters(p, [a.id, b.id]);

  const made = newCritter(result.outcomeTier, result.outcomeEssence, result.outcomeGrade);
  made.speciesId = `${result.outcomeEssence}-t${result.outcomeTier}`;
  p.critters.push(made);
  p.residueShards += result.residueShards;

  autoField(p);
  ensureLeader(p);
  recordDaily(p, "transmutes", Date.now());

  return {
    success: result.success,
    outcomeCritter: result.success ? made : undefined,
    slagCritter: result.success ? undefined : made,
    gristSpent: grist,
    elixirSpent: elixir,
    shardsGained: result.residueShards,
    successRateUsed: result.successRateUsed,
  };
}

function removeCritters(p: PlayerState, ids: string[]): void {
  const set = new Set(ids);
  p.critters = p.critters.filter((c) => !set.has(c.id));
  p.broodIds = p.broodIds.filter((id) => !set.has(id));
  if (p.leaderId && set.has(p.leaderId)) p.leaderId = undefined;
}

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------

export interface QuestOutcome {
  gristGained: number;
  xpGained: number;
  captured?: Critter;
}

const QUEST_ENERGY = 5;

export function doQuest(p: PlayerState, now: number): QuestOutcome {
  regenResources(p, now);
  const wasFull = p.energy >= cap(p, "energy");
  if (p.energy < QUEST_ENERGY) throw new GameError("Not enough Energy");
  p.energy -= QUEST_ENERGY;
  if (wasFull) p.energyTs = now;

  const rng = rngFactory();
  const grist = Math.round((200 + Math.floor(rng() * 300)) * questGristMultiplier(now));
  const xp = 35 + Math.floor(rng() * 25); // 35-59 XP per quest (reach L2 in ~1 energy bar)
  p.grist += grist;
  grantXp(p, xp);

  let captured: Critter | undefined;
  if (rng() < 0.4) {
    const essences = ["ember", "brine", "loam", "vapor", "brimstone", "gleam"] as const;
    const e = essences[Math.floor(rng() * essences.length)]!;
    captured = newCritter(2, e);
    p.critters.push(captured);
  }

  autoField(p);
  ensureLeader(p);
  recordDaily(p, "quests", now);
  return { gristGained: grist, xpGained: xp, captured };
}

// ---------------------------------------------------------------------------
// Gacha eggs
// ---------------------------------------------------------------------------

export type EggType = "crucible" | "refined" | "opus";

interface EggDef {
  elixir: number;
  floor: (level: number) => number;
  span: number; // tiers above floor
}

const EGGS: Record<EggType, EggDef> = {
  crucible: { elixir: 5, floor: (lvl) => Math.max(2, Math.floor(lvl / 8)), span: 3 },
  refined: { elixir: 50, floor: (lvl) => Math.max(4, Math.floor(lvl / 6)), span: 3 },
  opus: { elixir: 300, floor: () => 8, span: 2 },
};

const PITY_THRESHOLD = 30; // paid pulls without tier>=8 -> next guaranteed tier>=8

export interface EggOutcome {
  critter: Critter;
  pity: boolean;
}

export function buyEgg(p: PlayerState, type: EggType): EggOutcome {
  const def = EGGS[type];
  if (!def) throw new GameError("Unknown egg");
  if (p.elixir < def.elixir) throw new GameError("Not enough Elixir");
  p.elixir -= def.elixir;

  const rng = rngFactory();
  const floor = def.floor(p.level);
  let tier = Math.min(MAX_FROM_EGG, floor + Math.floor(rng() * (def.span + 1)));

  // Pity: force a high tier if we've gone too long without one.
  let pity = false;
  if (p.pity + 1 >= PITY_THRESHOLD && tier < 8) {
    tier = 8;
    pity = true;
  }
  if (tier >= 8) p.pity = 0;
  else p.pity += 1;

  const essence = ESSENCE_IDS[Math.floor(rng() * ESSENCE_IDS.length)]!;
  const critter = newCritter(tier as Tier, essence);
  p.critters.push(critter);
  autoField(p);
  ensureLeader(p);
  return { critter, pity };
}

const MAX_FROM_EGG = 10; // Magnum Opus (11) is evolution-only

// ---------------------------------------------------------------------------
// Apparatus, skills, vault
// ---------------------------------------------------------------------------

export function buyApparatus(p: PlayerState, apparatusId: string): { cost: number; count: number } {
  const def = APPARATUS.find((a) => a.id === apparatusId);
  if (!def) throw new GameError("Unknown apparatus");
  const owned = p.apparatus[apparatusId] ?? 0;
  const cost = apparatusCost(def.baseCost, owned);
  if (p.grist < cost) throw new GameError("Not enough Grist");
  p.grist -= cost;
  p.apparatus[apparatusId] = owned + 1;
  return { cost, count: owned + 1 };
}

export function spendSkill(p: PlayerState, stat: SkillKey): void {
  if (p.skillPoints <= 0) throw new GameError("No skill points to spend");
  if (!(stat in p.skills)) throw new GameError("Unknown skill");
  p.skillPoints -= 1;
  p.skills[stat] += 1;
  // Raising a resource cap also grants the point immediately.
  if (stat === "energy" || stat === "stamina" || stat === "hp") p[stat] += 1;
}

export function vaultDeposit(p: PlayerState, amount: number): { deposited: number; fee: number } {
  if (!Number.isFinite(amount) || amount <= 0) throw new GameError("Amount must be positive");
  if (p.grist < amount) throw new GameError("Not enough Grist");
  const fee = vaultFee(amount);
  p.grist -= amount;
  p.vaultGrist += amount - fee;
  return { deposited: amount - fee, fee };
}

export function vaultWithdraw(p: PlayerState, amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) throw new GameError("Amount must be positive");
  if (p.vaultGrist < amount) throw new GameError("Not enough vaulted Grist");
  p.vaultGrist -= amount;
  p.grist += amount;
}

// ---------------------------------------------------------------------------
// Raid
// ---------------------------------------------------------------------------

export interface RaidOutcome {
  win: boolean;
  gristStolen: number;
  attackerRoll: number;
  defenderRoll: number;
}

const RAID_STAMINA = 1;

export function doRaid(attacker: PlayerState, defender: PlayerState, now: number): RaidOutcome {
  regenResources(attacker, now);
  const wasFull = attacker.stamina >= cap(attacker, "stamina");
  if (attacker.stamina < RAID_STAMINA) throw new GameError("Not enough Stamina");
  attacker.stamina -= RAID_STAMINA;
  if (wasFull) attacker.staminaTs = now;

  const atkBrood = attacker.critters.filter((c) => attacker.broodIds.includes(c.id));
  const defBrood = defender.critters.filter((c) => defender.broodIds.includes(c.id));
  const atkLeader = attacker.critters.find((c) => c.id === attacker.leaderId);
  const defLeader = defender.critters.find((c) => c.id === defender.leaderId);

  const atkTotals = broodTotals(atkBrood, atkLeader);
  const defTotals = broodTotals(defBrood, defLeader);
  const topTier = Math.max(atkTotals.topTier, defTotals.topTier) as Tier;

  const atk = atkTotals.atk + (attacker.skills?.attack ?? 0);
  const def = defTotals.def + (defender.skills?.defense ?? 0);
  const r = resolveRaid(atk, def, topTier, rngFactory());

  let stolen = 0;
  if (r.win) {
    stolen = raidSteal(defender.grist);
    defender.grist -= stolen;
    attacker.grist += stolen;
    grantXp(attacker, 5);
    recordDaily(attacker, "raidWins", now);
  }
  if (defender.isGhost && defender.ghostBaselineGrist != null) {
    defender.grist = defender.ghostBaselineGrist;
  }
  return { win: r.win, gristStolen: stolen, attackerRoll: r.attackerRoll, defenderRoll: r.defenderRoll };
}
