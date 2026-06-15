import { APPARATUS, ECONOMY, PROGRESSION, RESOURCES } from "./config/economy.js";

/** Cost to buy the nth-of-type apparatus (owned = how many of this type already built). */
export function apparatusCost(baseCost: number, ownedOfType: number): number {
  return Math.round(baseCost + baseCost * ECONOMY.apparatusCostGrowth * ownedOfType);
}

/** Total Grist/hour from a map of apparatusId -> count. */
export function gristPerHour(owned: Record<string, number>): number {
  let total = 0;
  for (const a of APPARATUS) {
    total += a.gristPerHour * (owned[a.id] ?? 0);
  }
  return total;
}

/** Idle Grist accrued over an elapsed period, capped at the offline cap. */
export function offlineGrist(perHour: number, secondsElapsed: number): number {
  const capped = Math.min(secondsElapsed, ECONOMY.offlineCapSeconds);
  return Math.floor((perHour * capped) / 3600);
}

/** Friendly PvP: Grist stolen from a target's un-vaulted balance on a win. */
export function raidSteal(targetUnvaultedGrist: number): number {
  return Math.floor(targetUnvaultedGrist * ECONOMY.raidStealFraction);
}

/** Fee charged when depositing Grist into the Vault. */
export function vaultFee(amount: number): number {
  return Math.ceil(amount * ECONOMY.vaultFeeFraction);
}

/** Resource cap for a player level. */
export function resourceCap(
  resource: "energy" | "stamina" | "bossAp" | "hp",
  level: number,
): number {
  const r = RESOURCES[resource];
  return r.baseCap + r.capPerLevel * (level - 1);
}

/** Points regenerated over an elapsed period (uncapped — caller clamps to cap). */
export function regenPoints(
  resource: "energy" | "stamina" | "bossAp" | "hp",
  secondsElapsed: number,
): number {
  return Math.floor(secondsElapsed / RESOURCES[resource].secondsPerPoint);
}

/** XP required to reach a given level. */
export function xpForLevel(level: number): number {
  return Math.round(PROGRESSION.xpCoefficient * Math.pow(level, PROGRESSION.xpExponent));
}

/** Grist to fully heal at a given level (or pay 1 Elixir to instant-heal). */
export function healCost(level: number): number {
  return Math.round(level * level * 2);
}

/** Max critters fieldable in a brood. */
export function maxFielded(level: number, covenmates: number): number {
  const f = PROGRESSION.fielded;
  return Math.min(f.cap, f.base + f.perLevel * level + f.perCovenmate * covenmates);
}
