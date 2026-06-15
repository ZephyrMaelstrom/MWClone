import { ESSENCE_IDS, mulberry32, type Critter, type Tier } from "@cc/engine";
import { allPlayers, createGhost, newCritter } from "./store.js";

/**
 * "Wandering Alchemist" bot rivals so the Raid tab is populated from the first
 * launch. A difficulty ladder: the weakest is beatable by a fresh starter brood;
 * the strongest is an endgame target. Ghosts refill their Grist after each raid
 * (see game.doRaid), so they're always farmable.
 */
interface GhostDef {
  name: string;
  level: number;
  topTier: Tier;
  size: number;
  grist: number;
}

const GHOSTS: GhostDef[] = [
  { name: "Soot the Apprentice", level: 2, topTier: 2, size: 4, grist: 800 },
  { name: "Brother Quicklime", level: 4, topTier: 3, size: 5, grist: 2000 },
  { name: "Mistress Verdigris", level: 8, topTier: 4, size: 6, grist: 5000 },
  { name: "The Tin Baron", level: 13, topTier: 5, size: 7, grist: 12000 },
  { name: "Madame Cinnabar", level: 20, topTier: 6, size: 8, grist: 25000 },
  { name: "Archmagus Aurum", level: 30, topTier: 7, size: 9, grist: 60000 },
];

function makeBrood(topTier: Tier, size: number, seed: number): Critter[] {
  const rng = mulberry32(seed);
  const brood: Critter[] = [];
  for (let i = 0; i < size; i++) {
    const tier = Math.max(2, topTier - (i % 2)) as Tier; // mix top and one below
    const essence = ESSENCE_IDS[Math.floor(rng() * ESSENCE_IDS.length)]!;
    brood.push(newCritter(tier, essence));
  }
  return brood;
}

/** Seed the ghost roster once (idempotent — skips if any ghost already exists). */
export function seedGhosts(now: number): number {
  if (allPlayers().some((p) => p.isGhost)) return 0;
  GHOSTS.forEach((g, idx) => {
    createGhost(g.name, g.level, g.grist, makeBrood(g.topTier, g.size, idx + 1), now);
  });
  return GHOSTS.length;
}
