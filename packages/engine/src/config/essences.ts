import type { Essence, EssenceId } from "../types";

/** The six essences. atkParts + defParts always === 7 (clean stat math). */
export const ESSENCES: Record<EssenceId, Essence> = {
  brimstone: { id: "brimstone", name: "Brimstone", atkParts: 6, defParts: 1, leader: "team ATK +1..12%" },
  vapor: { id: "vapor", name: "Vapor", atkParts: 5, defParts: 2, leader: "+max critters fielded" },
  ember: { id: "ember", name: "Ember", atkParts: 4, defParts: 3, leader: "Energy regen speedup" },
  brine: { id: "brine", name: "Brine", atkParts: 3, defParts: 4, leader: "Stamina regen speedup" },
  loam: { id: "loam", name: "Loam", atkParts: 2, defParts: 5, leader: "Grist income +5..60%" },
  gleam: { id: "gleam", name: "Gleam", atkParts: 1, defParts: 6, leader: "team DEF +1..12%" },
};

export const ESSENCE_IDS: EssenceId[] = Object.keys(ESSENCES) as EssenceId[];

/**
 * Transmutation fusion grid: combining essence A + B yields the output essence.
 * Symmetric (A+B === B+A); same+same === same. Derived from Monster Warlord's grid.
 * Steer toward `brimstone` for offense or `gleam` for defense.
 */
export const FUSION_GRID: Record<EssenceId, Record<EssenceId, EssenceId>> = {
  brimstone: { brimstone: "brimstone", vapor: "loam", ember: "gleam", brine: "ember", loam: "brimstone", gleam: "brine" },
  vapor: { brimstone: "loam", vapor: "vapor", ember: "brine", brine: "gleam", loam: "vapor", gleam: "ember" },
  ember: { brimstone: "gleam", vapor: "brine", ember: "ember", brine: "brimstone", loam: "ember", gleam: "loam" },
  brine: { brimstone: "ember", vapor: "gleam", ember: "brimstone", brine: "brine", loam: "brine", gleam: "vapor" },
  loam: { brimstone: "brimstone", vapor: "vapor", ember: "ember", brine: "brine", loam: "loam", gleam: "gleam" },
  gleam: { brimstone: "brine", vapor: "ember", ember: "loam", brine: "vapor", loam: "gleam", gleam: "gleam" },
};

/** Grade stat multipliers (stack on top of tier power). */
export const GRADE_MULT: Record<string, number> = {
  normal: 1.0,
  plus: 1.25,
  omega: 1.6,
  star: 2.3,
};
