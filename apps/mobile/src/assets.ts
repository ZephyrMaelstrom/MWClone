import type { Critter, EssenceId } from "@cc/engine";

type Stage = "low" | "mid" | "high";

/** Visual refinement stage by tier: 1-4 grubby, 5-8 gleaming, 9-10 radiant. */
function stageFor(tier: number): Stage {
  if (tier <= 4) return "low";
  if (tier <= 8) return "mid";
  return "high";
}

// Static requires so Metro bundles every asset. Backgrounds removed (transparent PNGs).
const ART: Record<EssenceId, Record<Stage, number>> = {
  brimstone: {
    low: require("../assets/critters/brimstone-low.png"),
    mid: require("../assets/critters/brimstone-mid.png"),
    high: require("../assets/critters/brimstone-high.png"),
  },
  vapor: {
    low: require("../assets/critters/vapor-low.png"),
    mid: require("../assets/critters/vapor-mid.png"),
    high: require("../assets/critters/vapor-high.png"),
  },
  ember: {
    low: require("../assets/critters/ember-low.png"),
    mid: require("../assets/critters/ember-mid.png"),
    high: require("../assets/critters/ember-high.png"),
  },
  brine: {
    low: require("../assets/critters/brine-low.png"),
    mid: require("../assets/critters/brine-mid.png"),
    high: require("../assets/critters/brine-high.png"),
  },
  loam: {
    low: require("../assets/critters/loam-low.png"),
    mid: require("../assets/critters/loam-mid.png"),
    high: require("../assets/critters/loam-high.png"),
  },
  gleam: {
    low: require("../assets/critters/gleam-low.png"),
    mid: require("../assets/critters/gleam-mid.png"),
    high: require("../assets/critters/gleam-high.png"),
  },
};

const MAGNUM_OPUS: number = require("../assets/critters/magnum-opus.png");

/** Concept art for a critter: per-essence, per-tier-stage; Magnum Opus for the peak. */
export function critterArt(c: Critter): number {
  if (c.tier >= 11) return MAGNUM_OPUS;
  return ART[c.essence][stageFor(c.tier)];
}

export const crucibleArt: number = require("../assets/ui/crucible.png");
export const crucibleSlagArt: number = require("../assets/ui/crucible-slag.png");
