import { broodTotals, mulberry32, type Critter, type Tier } from "@cc/engine";
import { dbGetMeta, dbSetMeta } from "./db.js";
import { GameError } from "./errors.js";
import { autoField, ensureLeader } from "./game.js";
import { allPlayers, getPlayer, newCritter, savePlayer, type PlayerState } from "./store.js";

const SEASON_KEY = "arenaSeason";
const WEEK = 7 * 24 * 3600 * 1000;
const K = 32;
const BASE_RATING = 1000;
const RENOWN_WIN = 50;
const RENOWN_LOSS = 10;

interface Season {
  id: number;
  startsAt: number;
}

/** Ensure a current season; roll over (pay top 3, reset ratings) when a week passes. */
export function ensureSeason(now: number): Season {
  let s = dbGetMeta<Season>(SEASON_KEY);
  if (!s) {
    s = { id: 1, startsAt: now };
    dbSetMeta(SEASON_KEY, s);
    return s;
  }
  if (now - s.startsAt >= WEEK) {
    payoutAndReset();
    s = { id: s.id + 1, startsAt: now };
    dbSetMeta(SEASON_KEY, s);
  }
  return s;
}

function payoutAndReset(): void {
  const ranked = allPlayers()
    .filter((p) => !p.isGhost)
    .sort((a, b) => b.arenaRating - a.arenaRating);
  const payouts = [1000, 500, 250];
  ranked.slice(0, 3).forEach((p, i) => {
    p.renown += payouts[i]!;
  });
  for (const p of allPlayers()) {
    p.arenaRating = BASE_RATING;
    p.arenaWins = 0;
    savePlayer(p);
  }
}

function broodAtk(p: PlayerState): number {
  const brood = p.critters.filter((c: Critter) => p.broodIds.includes(c.id));
  const leader = p.critters.find((c) => c.id === p.leaderId);
  return broodTotals(brood, leader).atk + (p.skills?.attack ?? 0);
}

function broodDef(p: PlayerState): number {
  const brood = p.critters.filter((c: Critter) => p.broodIds.includes(c.id));
  const leader = p.critters.find((c) => c.id === p.leaderId);
  return broodTotals(brood, leader).def + (p.skills?.defense ?? 0);
}

export interface ArenaOpponent {
  id: string;
  name: string;
  rating: number;
  isGhost: boolean;
}

/** Up to `count` opponents nearest the player's rating (excludes self). */
export function opponents(p: PlayerState, count: number, now: number): ArenaOpponent[] {
  ensureSeason(now);
  return allPlayers()
    .filter((o) => o.id !== p.id)
    .sort((a, b) => Math.abs(a.arenaRating - p.arenaRating) - Math.abs(b.arenaRating - p.arenaRating))
    .slice(0, count)
    .map((o) => ({ id: o.id, name: o.name, rating: o.arenaRating, isGhost: !!o.isGhost }));
}

export interface FightResult {
  win: boolean;
  ratingBefore: number;
  ratingAfter: number;
  renown: number;
}

export function fight(p: PlayerState, opponentId: string, now: number): FightResult {
  ensureSeason(now);
  if (p.id === opponentId) throw new GameError("Pick an opponent");
  const opp = getPlayer(opponentId);
  if (!opp) throw new GameError("Opponent not found");
  if (p.stamina < 1) throw new GameError("Not enough Stamina");
  p.stamina -= 1;
  p.staminaTs = now;

  const atk = broodAtk(p);
  const def = broodDef(opp);
  // Bounded RNG, same spirit as raids.
  const rng = mulberry32((now ^ p.arenaWins ^ atk) >>> 0);
  const aRoll = atk * (0.85 + rng() * 0.3);
  const dRoll = def * (0.85 + rng() * 0.3);
  const win = aRoll > dRoll;

  const expected = 1 / (1 + 10 ** ((opp.arenaRating - p.arenaRating) / 400));
  const before = p.arenaRating;
  p.arenaRating = Math.max(0, Math.round(p.arenaRating + K * ((win ? 1 : 0) - expected)));
  const renown = win ? RENOWN_WIN : RENOWN_LOSS;
  p.renown += renown;
  if (win) p.arenaWins += 1;

  return { win, ratingBefore: before, ratingAfter: p.arenaRating, renown };
}

export interface Standing {
  id: string;
  name: string;
  rating: number;
  wins: number;
  isGhost: boolean;
}

export function standings(now: number): { seasonId: number; endsAt: number; rows: Standing[] } {
  const s = ensureSeason(now);
  const rows = allPlayers()
    .map((p) => ({ id: p.id, name: p.name, rating: p.arenaRating, wins: p.arenaWins, isGhost: !!p.isGhost }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 20);
  return { seasonId: s.id, endsAt: s.startsAt + WEEK, rows };
}

// --- Renown shop ---
const RENOWN_EGG_COST = 800;

export function buyRenownEgg(p: PlayerState): Critter {
  if (p.renown < RENOWN_EGG_COST) throw new GameError(`Costs ${RENOWN_EGG_COST} Renown`);
  p.renown -= RENOWN_EGG_COST;
  // A guaranteed mid-high tier, scaling slightly with level.
  const floor = Math.max(5, Math.min(8, Math.floor(p.level / 6) + 5));
  const tier = Math.min(9, floor + Math.floor(Math.random() * 2)) as Tier;
  const essences = ["brimstone", "gleam", "ember", "brine", "loam", "vapor"] as const;
  const critter = newCritter(tier, essences[Math.floor(Math.random() * essences.length)]!);
  p.critters.push(critter);
  autoField(p);
  ensureLeader(p);
  return critter;
}

export const RENOWN_SHOP = { renownEgg: RENOWN_EGG_COST };
