import type { Critter, EssenceId } from "@cc/engine";

// Static requires so Metro bundles the assets.
const ESSENCE_ART: Record<EssenceId, number> = {
  ember: require("../assets/critters/ember-t1.png"),
  brine: require("../assets/critters/brine-t1.png"),
  loam: require("../assets/critters/loam-t1.png"),
  vapor: require("../assets/critters/vapor-t1.png"),
  brimstone: require("../assets/critters/brimstone-t1.png"),
  gleam: require("../assets/critters/gleam-t1.jpg"),
};

const MAGNUM_OPUS: number = require("../assets/critters/magnum-opus.png");

/** Concept art for a critter. For now lower tiers reuse the essence art; the
 *  Magnum Opus tier gets the legendary showpiece. Add per-tier art over time. */
export function critterArt(c: Critter): number {
  if (c.tier >= 11) return MAGNUM_OPUS;
  return ESSENCE_ART[c.essence];
}

export const crucibleArt: number = require("../assets/ui/crucible.png");
export const crucibleSlagArt: number = require("../assets/ui/crucible-slag.png");
