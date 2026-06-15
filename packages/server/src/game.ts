import {
  type Critter,
  type Rng,
  type Tier,
  broodTotals,
  canTransmute,
  catalystCost,
  gristCost,
  gristPerHour,
  mulberry32,
  offlineGrist,
  raidSteal,
  resolveRaid,
  resourceCap,
  regenPoints,
  RESOURCES,
  transmute,
  xpForLevel,
  PROGRESSION,
} from "@cc/engine";
import { type PlayerState, newCritter } from "./store.js";

/** Server-side RNG (fresh sequence per action). Override in tests for determinism. */
let rngFactory: () => Rng = () => mulberry32((Math.random() * 2 ** 32) >>> 0);
export function setRngFactory(f: () => Rng): void {
  rngFactory = f;
}

export class GameError extends Error {}

/** Apply pending resource regen up to cap, mutating the player. */
export function regenResources(p: PlayerState, now: number): void {
  for (const key of ["energy", "stamina", "hp"] as const) {
    const tsKey = `${key}Ts` as const;
    const cap = resourceCap(key, p.level);
    const elapsed = Math.max(0, now - p[tsKey]);
    const gained = regenPoints(key, Math.floor(elapsed / 1000));
    if (gained > 0 && p[key] < cap) {
      p[key] = Math.min(cap, p[key] + gained);
      // advance timestamp by exactly the consumed whole-second buckets
      p[tsKey] = p[tsKey] + gained * RESOURCES[key].secondsPerPoint * 1000;
    }
    if (p[key] >= cap) p[tsKey] = now;
  }
}

export function pendingIdleGrist(p: PlayerState, now: number): number {
  const perHour = gristPerHour(p.apparatus);
  return offlineGrist(perHour, Math.floor((now - p.lastClaimTs) / 1000));
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
    // level-up refills resources
    p.energy = resourceCap("energy", p.level);
    p.stamina = resourceCap("stamina", p.level);
    p.hp = resourceCap("hp", p.level);
  }
}

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
    { catalyst },
    rngFactory(),
  );

  // Spend & consume inputs.
  p.grist -= grist;
  p.elixir -= elixir;
  removeCritters(p, [a.id, b.id]);

  const made = newCritter(result.outcomeTier, result.outcomeEssence, result.outcomeGrade);
  made.speciesId = `${result.outcomeEssence}-t${result.outcomeTier}`;
  p.critters.push(made);
  p.residueShards += result.residueShards;

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

export interface QuestOutcome {
  gristGained: number;
  xpGained: number;
  captured?: Critter;
}

const QUEST_ENERGY = 5;

/** Current value, cap, and seconds until the next +1 for a regenerating resource. */
export function resourceView(
  p: PlayerState,
  key: "energy" | "stamina" | "hp",
  now: number,
): { value: number; max: number; secondsToNext: number } {
  const max = resourceCap(key, p.level);
  const value = p[key];
  let secondsToNext = 0;
  if (value < max) {
    const sec = RESOURCES[key].secondsPerPoint;
    const elapsed = Math.max(0, Math.floor((now - p[`${key}Ts`]) / 1000));
    secondsToNext = sec - (elapsed % sec);
  }
  return { value, max, secondsToNext };
}

export function doQuest(p: PlayerState, now: number): QuestOutcome {
  regenResources(p, now);
  const wasFull = p.energy >= resourceCap("energy", p.level);
  if (p.energy < QUEST_ENERGY) throw new GameError("Not enough Energy");
  p.energy -= QUEST_ENERGY;
  // Start the regen timer only if we spent from a full pool; otherwise keep the
  // existing timer so partial progress toward the next point isn't lost.
  if (wasFull) p.energyTs = now;

  const rng = rngFactory();
  const grist = 200 + Math.floor(rng() * 300);
  const xp = 10 + Math.floor(rng() * 10);
  p.grist += grist;
  grantXp(p, xp);

  let captured: Critter | undefined;
  if (rng() < 0.4) {
    const essences = ["ember", "brine", "loam", "vapor", "brimstone", "gleam"] as const;
    const e = essences[Math.floor(rng() * essences.length)]!;
    captured = newCritter(2, e);
    p.critters.push(captured);
  }
  return { gristGained: grist, xpGained: xp, captured };
}

export interface RaidOutcome {
  win: boolean;
  gristStolen: number;
  attackerRoll: number;
  defenderRoll: number;
}

const RAID_STAMINA = 1;

export function doRaid(attacker: PlayerState, defender: PlayerState, now: number): RaidOutcome {
  regenResources(attacker, now);
  const wasFull = attacker.stamina >= resourceCap("stamina", attacker.level);
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

  const r = resolveRaid(atkTotals.atk, defTotals.def, topTier, rngFactory());

  let stolen = 0;
  if (r.win) {
    stolen = raidSteal(defender.grist); // friendly: only un-vaulted Grist
    defender.grist -= stolen;
    attacker.grist += stolen;
    grantXp(attacker, 5);
  }
  // Ghost rivals refill to baseline so they're always worth raiding.
  if (defender.isGhost && defender.ghostBaselineGrist != null) {
    defender.grist = defender.ghostBaselineGrist;
  }
  return { win: r.win, gristStolen: stolen, attackerRoll: r.attackerRoll, defenderRoll: r.defenderRoll };
}
