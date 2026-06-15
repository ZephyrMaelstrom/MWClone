/** Economy, timers, and progression constants (see docs/TUNING.md). */

export interface ApparatusDef {
  id: string;
  name: string;
  gristPerHour: number;
  baseCost: number;
}

/** Idle income buildings. nth-of-type cost = baseCost + baseCost*0.10*ownedOfType. */
export const APPARATUS: ApparatusDef[] = [
  { id: "hut", name: "Hut", gristPerHour: 5, baseCost: 200 },
  { id: "bellows", name: "Bellows", gristPerHour: 50, baseCost: 2000 },
  { id: "forge", name: "Forge", gristPerHour: 500, baseCost: 40000 },
  { id: "market", name: "Market", gristPerHour: 1600, baseCost: 200000 },
  { id: "foundry", name: "Foundry", gristPerHour: 3500, baseCost: 1000000 },
  { id: "athanor", name: "Athanor", gristPerHour: 8000, baseCost: 8000000 },
  { id: "grand_athanor", name: "Grand Athanor", gristPerHour: 18000, baseCost: 40000000 },
  { id: "philosophers_forge", name: "Philosopher's Forge", gristPerHour: 40000, baseCost: 200000000 },
];

export const ECONOMY = {
  apparatusCostGrowth: 0.1,
  /** Idle income accrues at most this many seconds while away. */
  offlineCapSeconds: 24 * 3600,
  /** Friendly PvP tuning. */
  raidStealFraction: 0.1, // of un-vaulted Grist
  vaultFeeFraction: 0.05,
  critterLossOnRaid: false,
  hpFloorFraction: 0.25, // can't be raided below this HP
} as const;

/** Resource regen + caps. */
export const RESOURCES = {
  energy: { secondsPerPoint: 120, baseCap: 20, capPerLevel: 2 },
  stamina: { secondsPerPoint: 90, baseCap: 15, capPerLevel: 1 },
  bossAp: { secondsPerPoint: 1200, baseCap: 10, capPerLevel: 0 },
  hp: { secondsPerPoint: 60, baseCap: 100, capPerLevel: 0 },
  rechargeElixirCost: 10,
} as const;

export const PROGRESSION = {
  skillPointsPerLevel: 3,
  /** XP required to reach level n. */
  xpCoefficient: 60,
  xpExponent: 1.5,
  questAreaEveryLevels: 3,
  respecGristPerCount: 5000,
  respecElixir: 20,
  /** maxFielded = min(cap, base + level*perLevel + covenmates*perCovenmate). */
  fielded: { base: 12, perLevel: 1, perCovenmate: 3, cap: 120 },
} as const;
