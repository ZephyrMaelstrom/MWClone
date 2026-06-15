import { FUSION_GRID, ESSENCE_IDS } from "./config/essences.js";
import { MAX_TRANSMUTE_TIER } from "./config/tiers.js";
import {
  TRANSMUTE,
  catalystCost,
  gristCost,
  recoverCost,
  successRate,
} from "./config/transmute.js";
import type { EssenceId, Grade, Rng, Tier } from "./types.js";

export interface TransmuteInputs {
  /** Both inputs must share this tier. */
  tier: Tier;
  essenceA: EssenceId;
  essenceB: EssenceId;
  gradeA?: Grade;
  gradeB?: Grade;
}

export interface TransmuteOptions {
  /** Catalyst guarantees success (paid in Elixir). */
  catalyst?: boolean;
  /** Additive success bonus from VIP/relic/event (e.g. 0.2 for a Merge Event). */
  successBonus?: number;
  /** S-merge: two Plus inputs guarantee a Plus result. */
  sMerge?: boolean;
}

export interface TransmuteResult {
  success: boolean;
  /** Resulting critter's tier (= input tier + 1 on success, or input tier on fail/slag). */
  outcomeTier: Tier;
  outcomeEssence: EssenceId;
  outcomeGrade: Grade;
  /** Whether a double-success extra tier jump occurred. */
  doubleJump: boolean;
  /** On failure, a Residue Shard is produced. */
  residueShards: number;
  gristCost: number;
  elixirCost: number;
  successRateUsed: number;
}

/** Is a pair of this input tier eligible for normal transmutation? */
export function canTransmute(inputTier: Tier): boolean {
  return inputTier >= 2 && ((inputTier + 1) as number) <= MAX_TRANSMUTE_TIER;
}

/** Output essence for combining two essences (symmetric grid). */
export function fuseEssence(a: EssenceId, b: EssenceId): EssenceId {
  return FUSION_GRID[a][b];
}

function pickRandomEssence(rng: Rng): EssenceId {
  const i = Math.min(ESSENCE_IDS.length - 1, Math.floor(rng() * ESSENCE_IDS.length));
  return ESSENCE_IDS[i]!;
}

/**
 * Resolve a single transmutation. Pure: all randomness comes from `rng`.
 * Throws if the input tier cannot be transmuted.
 */
export function transmute(inputs: TransmuteInputs, opts: TransmuteOptions, rng: Rng): TransmuteResult {
  const { tier, essenceA, essenceB } = inputs;
  if (!canTransmute(tier)) {
    throw new Error(`Tier ${tier} cannot be transmuted`);
  }
  const resultTier = (tier + 1) as Tier;
  const gradeA = inputs.gradeA ?? "normal";
  const gradeB = inputs.gradeB ?? "normal";

  const grist = gristCost(resultTier);
  const elixir = opts.catalyst ? catalystCost(resultTier) : 0;

  let rate: number;
  if (opts.catalyst) {
    rate = 1;
  } else {
    rate = Math.min(TRANSMUTE.successCap, successRate(resultTier) + (opts.successBonus ?? 0));
  }

  const success = rng() < rate;
  const outcomeEssence = fuseEssence(essenceA, essenceB);

  if (!success) {
    // Failure: lose inputs, receive one same-tier critter of random essence (Slag).
    return {
      success: false,
      outcomeTier: tier,
      outcomeEssence: pickRandomEssence(rng),
      outcomeGrade: "normal",
      doubleJump: false,
      residueShards: TRANSMUTE.shardsPerFail,
      gristCost: grist,
      elixirCost: elixir,
      successRateUsed: rate,
    };
  }

  // Success: optional double-tier jump.
  const doubleChance = opts.catalyst ? TRANSMUTE.doubleSuccessCatalyst : TRANSMUTE.doubleSuccessBase;
  let outcomeTier = resultTier;
  let doubleJump = false;
  if (rng() < doubleChance && ((resultTier + 1) as number) <= MAX_TRANSMUTE_TIER) {
    outcomeTier = (resultTier + 1) as Tier;
    doubleJump = true;
  }

  // Grade roll.
  let outcomeGrade: Grade = "normal";
  const bothPlus = gradeA === "plus" && gradeB === "plus";
  if (bothPlus) {
    if (rng() < TRANSMUTE.omegaChance) outcomeGrade = "omega";
    else outcomeGrade = "plus"; // S-merge / two-plus guarantees at least Plus
  } else if (opts.sMerge && (gradeA === "plus" || gradeB === "plus")) {
    outcomeGrade = "plus";
  } else if (rng() < TRANSMUTE.plusChance) {
    outcomeGrade = "plus";
  }

  return {
    success: true,
    outcomeTier,
    outcomeEssence,
    outcomeGrade,
    doubleJump,
    residueShards: 0,
    gristCost: grist,
    elixirCost: elixir,
    successRateUsed: rate,
  };
}

/** Elixir cost to recover the two original inputs after a failed transmute. */
export function recoverElixirCost(inputTier: Tier): number {
  return recoverCost((inputTier + 1) as Tier);
}
