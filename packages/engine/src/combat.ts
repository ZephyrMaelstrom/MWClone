import { critterStats } from "./power.js";
import type { Critter, EssenceId, Rng, Tier } from "./types.js";

/** Team-wide leader multipliers, scaled by leader tier (2 -> ~+1%, 11 -> ~+12%). */
export function leaderAtkBonus(leaderEssence: EssenceId, leaderTier: Tier): number {
  if (leaderEssence !== "brimstone") return 0;
  return scaleByTier(leaderTier, 0.01, 0.12);
}

export function leaderDefBonus(leaderEssence: EssenceId, leaderTier: Tier): number {
  if (leaderEssence !== "gleam") return 0;
  return scaleByTier(leaderTier, 0.01, 0.12);
}

function scaleByTier(tier: Tier, min: number, max: number): number {
  // tier 2 -> min, tier 11 -> max, linear.
  const t = Math.max(2, Math.min(11, tier));
  return min + ((max - min) * (t - 2)) / 9;
}

export interface BroodTotals {
  atk: number;
  def: number;
  topTier: Tier;
}

/** Sum a brood's stats and apply the leader's bonus. */
export function broodTotals(brood: Critter[], leader?: Critter): BroodTotals {
  let atk = 0;
  let def = 0;
  let topTier: Tier = 1;
  for (const c of brood) {
    const s = critterStats(c);
    atk += s.atk;
    def += s.def;
    if (c.tier > topTier) topTier = c.tier;
  }
  if (leader) {
    atk = Math.round(atk * (1 + leaderAtkBonus(leader.essence, leader.tier)));
    def = Math.round(def * (1 + leaderDefBonus(leader.essence, leader.tier)));
  }
  return { atk, def, topTier };
}

export interface RaidResult {
  win: boolean;
  attackerRoll: number;
  defenderRoll: number;
  variance: number;
}

/**
 * Resolve attacker ATK vs defender DEF with bounded RNG.
 * Variance widens at top tiers (matches Monster Warlord behaviour).
 */
export function resolveRaid(
  attackerAtk: number,
  defenderDef: number,
  topTierInvolved: Tier,
  rng: Rng,
): RaidResult {
  const variance = topTierInvolved >= 9 ? 0.25 : 0.15;
  const attackerRoll = attackerAtk * (1 - variance + rng() * 2 * variance);
  const defenderRoll = defenderDef * (1 - variance + rng() * 2 * variance);
  return { win: attackerRoll > defenderRoll, attackerRoll, defenderRoll, variance };
}
