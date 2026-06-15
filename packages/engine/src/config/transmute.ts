import type { Tier } from "../types";

/** Base success rate keyed by RESULT tier (the tier produced). */
export const SUCCESS_BY_RESULT_TIER: Record<number, number> = {
  2: 0.75,
  3: 0.75,
  4: 0.75,
  5: 0.6,
  6: 0.6,
  7: 0.6,
  8: 0.45,
  9: 0.45,
  10: 0.35,
  // 11 is Evolution-only (cannot fail) and not produced by transmute().
};

/** Grist cost keyed by RESULT tier. */
export const GRIST_COST_BY_RESULT_TIER: Record<number, number> = {
  2: 100,
  3: 400,
  4: 1500,
  5: 6000,
  6: 25000,
  7: 100000,
  8: 450000,
  9: 2000000,
  10: 9000000,
};

/** Catalyst (sure-transmute) Elixir cost keyed by RESULT tier. */
export const CATALYST_COST_BY_RESULT_TIER: Record<number, number> = {
  2: 3,
  3: 3,
  4: 3,
  5: 8,
  6: 8,
  7: 20,
  8: 20,
  9: 60,
  10: 150,
};

/** Recover-on-fail Elixir cost keyed by RESULT tier (half of catalyst). */
export const RECOVER_COST_BY_RESULT_TIER: Record<number, number> = {
  2: 2,
  3: 2,
  4: 2,
  5: 4,
  6: 4,
  7: 10,
  8: 10,
  9: 30,
  10: 75,
};

/** Probabilities and caps. */
export const TRANSMUTE = {
  /** Max base+modifier success without a Catalyst. */
  successCap: 0.95,
  /** Chance a success jumps an extra tier. */
  doubleSuccessBase: 0.02,
  doubleSuccessCatalyst: 0.08,
  /** Chance a normal success yields a Plus-grade critter. */
  plusChance: 0.12,
  /** Chance two Plus inputs yield an Omega (else at least Plus). */
  omegaChance: 0.06,
  /** Shards from one failed transmute; SHARDS_PER_EGG shards -> a Mystery Egg. */
  shardsPerFail: 1,
  shardsPerEgg: 10,
  /** Max inputs in a single batch transmute. */
  maxBatch: 50,
} as const;

export function successRate(resultTier: number): number {
  return SUCCESS_BY_RESULT_TIER[resultTier] ?? 0;
}

export function gristCost(resultTier: number): number {
  return GRIST_COST_BY_RESULT_TIER[resultTier] ?? 0;
}

export function catalystCost(resultTier: number): number {
  return CATALYST_COST_BY_RESULT_TIER[resultTier] ?? 0;
}

export function recoverCost(resultTier: number): number {
  return RECOVER_COST_BY_RESULT_TIER[resultTier] ?? 0;
}

/** Can two critters of this input tier be transmuted? */
export function isTransmutableInputTier(inputTier: Tier): boolean {
  return inputTier >= 2 && inputTier <= 9; // produces tiers 3..10; tier 2 from Dross? no -> see note
}
