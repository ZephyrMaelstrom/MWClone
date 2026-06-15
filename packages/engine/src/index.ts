/** Crucible Critters shared game engine — public API. */
export * from "./types";
export * from "./rng";
export * from "./power";
export * from "./transmute";
export * from "./combat";
export * from "./economy";

export { ESSENCES, ESSENCE_IDS, FUSION_GRID, GRADE_MULT } from "./config/essences";
export { TIERS, MAX_TIER, MAX_TRANSMUTE_TIER } from "./config/tiers";
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
} from "./config/transmute";
export {
  APPARATUS,
  ECONOMY,
  RESOURCES,
  PROGRESSION,
  type ApparatusDef,
} from "./config/economy";
