/** Crucible Critters shared game engine — public API. */
export * from "./types.js";
export * from "./rng.js";
export * from "./power.js";
export * from "./transmute.js";
export * from "./combat.js";
export * from "./economy.js";

export { ESSENCES, ESSENCE_IDS, FUSION_GRID, GRADE_MULT } from "./config/essences.js";
export { TIERS, MAX_TIER, MAX_TRANSMUTE_TIER } from "./config/tiers.js";
export {
  SUCCESS_BY_RESULT_TIER,
  GRIST_COST_BY_RESULT_TIER,
  CATALYST_COST_BY_RESULT_TIER,
  RECOVER_COST_BY_RESULT_TIER,
  TRANSMUTE,
  successRate,
  gristCost,
  catalystCost,
  recoverCost,
} from "./config/transmute.js";
export {
  APPARATUS,
  ECONOMY,
  RESOURCES,
  PROGRESSION,
  type ApparatusDef,
} from "./config/economy.js";
