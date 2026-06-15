import type { Tier, TierDef } from "../types.js";

/**
 * The 11-tier transmutation ladder (Dross -> Magnum Opus).
 * `power` is the total AT+DF budget, split by essence ratio. ~2.6x/tier.
 * Authoritative source for power numbers (matches docs/TUNING.md).
 */
export const TIERS: Record<Tier, TierDef> = {
  1: { tier: 1, name: "Dross", power: 25, combinable: false },
  2: { tier: 2, name: "Lead", power: 65, combinable: true },
  3: { tier: 3, name: "Tin", power: 170, combinable: true },
  4: { tier: 4, name: "Iron", power: 450, combinable: true },
  5: { tier: 5, name: "Copper", power: 1150, combinable: true },
  6: { tier: 6, name: "Quicksilver", power: 3000, combinable: true },
  7: { tier: 7, name: "Silver", power: 7800, combinable: true },
  8: { tier: 8, name: "Gold", power: 20000, combinable: true },
  9: { tier: 9, name: "Platinum", power: 52000, combinable: true },
  10: { tier: 10, name: "Quintessence", power: 135000, combinable: true },
  11: { tier: 11, name: "Magnum Opus", power: 350000, combinable: false }, // Evolution-only
};

export const MAX_TIER: Tier = 11;
/** Highest tier reachable via normal transmutation (11 is Evolution-only). */
export const MAX_TRANSMUTE_TIER: Tier = 10;
