import { ESSENCES, GRADE_MULT } from "./config/essences";
import { TIERS } from "./config/tiers";
import type { Critter, EssenceId, Grade, Tier } from "./types";

export function tierPower(tier: Tier): number {
  return TIERS[tier].power;
}

export interface Stats {
  atk: number;
  def: number;
}

/** Compute a critter's Attack/Defense from tier power x essence ratio x grade. */
export function statsFor(tier: Tier, essence: EssenceId, grade: Grade = "normal"): Stats {
  const power = tierPower(tier);
  const e = ESSENCES[essence];
  const mult = GRADE_MULT[grade] ?? 1;
  return {
    atk: Math.round((power * e.atkParts * mult) / 7),
    def: Math.round((power * e.defParts * mult) / 7),
  };
}

export function critterStats(c: Critter): Stats {
  return statsFor(c.tier, c.essence, c.grade);
}
