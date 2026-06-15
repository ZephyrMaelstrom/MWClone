/** Core shared types for Crucible Critters. */

export type EssenceId =
  | "brimstone" // 6:1 max attack
  | "vapor" //     5:2
  | "ember" //     4:3
  | "brine" //     3:4
  | "loam" //      2:5
  | "gleam"; //    1:6 max defense

export type Grade = "normal" | "plus" | "omega" | "star";

/** A monster's "level" IS its tier (1 = Dross .. 11 = Magnum Opus). */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface Essence {
  id: EssenceId;
  name: string;
  /** Attack/Defense split parts; atkParts + defParts === 7. */
  atkParts: number;
  defParts: number;
  leader: string; // human description of leader effect
}

export interface TierDef {
  tier: Tier;
  name: string;
  power: number; // total AT+DF budget at this tier
  combinable: boolean;
}

/** A concrete owned critter. */
export interface Critter {
  id: string;
  speciesId: string;
  tier: Tier;
  essence: EssenceId;
  grade: Grade;
}

/** A catalog/codex entry. */
export interface Species {
  id: string;
  name: string;
  essence: EssenceId;
  tier: Tier;
  flavor?: string;
}

/** Deterministic RNG: returns a float in [0, 1). */
export type Rng = () => number;
