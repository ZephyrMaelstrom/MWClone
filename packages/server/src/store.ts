import { randomUUID } from "node:crypto";
import type { Critter, EssenceId, Grade, Tier } from "@cc/engine";
import { dbClear, dbDelete, dbLoadAll, dbUpsert } from "./db.js";

export type SkillKey = "attack" | "defense" | "hp" | "energy" | "stamina";
export type SkillAllocation = Record<SkillKey, number>;

function zeroSkills(): SkillAllocation {
  return { attack: 0, defense: 0, hp: 0, energy: 0, stamina: 0 };
}

export interface DailyState {
  date: string; // UTC day this set of counters belongs to
  quests: number;
  raidWins: number;
  transmutes: number;
  bossHits: number;
  claimed: string[]; // mission ids already claimed today
}

export interface AttendanceState {
  lastClaim: string; // UTC day of last claim
  day: number; // 1..25 calendar position
}

export interface RouletteState {
  lastSpin: string; // UTC day of last free spin
}

export function freshDaily(): DailyState {
  return { date: "", quests: 0, raidWins: 0, transmutes: 0, bossHits: 0, claimed: [] };
}

export interface PlayerState {
  id: string;
  name: string;
  level: number;
  xp: number;
  // currencies
  grist: number;
  vaultGrist: number;
  elixir: number;
  renown: number;
  reagents: number;
  residueShards: number;
  // resources (value + last regen timestamp ms)
  energy: number;
  energyTs: number;
  stamina: number;
  staminaTs: number;
  hp: number;
  hpTs: number;
  bossAp: number;
  bossApTs: number;
  // progression
  skillPoints: number;
  skills: SkillAllocation;
  pity: number; // paid egg pulls since a high-tier result
  daily: DailyState;
  attendance: AttendanceState;
  roulette: RouletteState;
  // economy
  apparatus: Record<string, number>;
  lastClaimTs: number;
  // collection
  critters: Critter[];
  leaderId?: string;
  broodIds: string[]; // critters fielded for offense/defense
  createdTs: number;
  // ghost (bot rival) fields
  isGhost?: boolean;
  ghostBaselineGrist?: number; // ghosts refill to this after being raided
}

/** Write-through in-memory cache over the SQLite store. */
const players = new Map<string, PlayerState>();

// Hydrate cache from disk on startup (normalising older records).
for (const p of dbLoadAll()) {
  normalize(p);
  players.set(p.id, p);
}

/** Backfill fields added after a profile was first created. */
export function normalize(p: PlayerState): void {
  if (!p.skills) p.skills = zeroSkills();
  if (p.bossAp == null) {
    p.bossAp = 10;
    p.bossApTs = Date.now();
  }
  if (p.pity == null) p.pity = 0;
  if (!p.daily) p.daily = freshDaily();
  if (!p.attendance) p.attendance = { lastClaim: "", day: 0 };
  if (!p.roulette) p.roulette = { lastSpin: "" };
}

export function newCritter(tier: Tier, essence: EssenceId, grade: Grade = "normal"): Critter {
  return { id: randomUUID(), speciesId: `${essence}-t${tier}`, tier, essence, grade };
}

/** Build a fresh starter profile body (shared by create + reset). */
function freshState(id: string, name: string, now: number): PlayerState {
  // Seed a starter brood: 2 Lead of three essences (so the player can transmute immediately).
  const starters: Critter[] = [
    newCritter(2, "ember"),
    newCritter(2, "ember"),
    newCritter(2, "brine"),
    newCritter(2, "brine"),
    newCritter(2, "loam"),
    newCritter(2, "loam"),
  ];
  return {
    id,
    name,
    level: 1,
    xp: 0,
    grist: 1000,
    vaultGrist: 0,
    elixir: 10,
    renown: 0,
    reagents: 0,
    residueShards: 0,
    energy: 20,
    energyTs: now,
    stamina: 15,
    staminaTs: now,
    hp: 100,
    hpTs: now,
    bossAp: 10,
    bossApTs: now,
    skillPoints: 0,
    skills: zeroSkills(),
    pity: 0,
    daily: freshDaily(),
    attendance: { lastClaim: "", day: 0 },
    roulette: { lastSpin: "" },
    apparatus: { hut: 1 },
    lastClaimTs: now,
    critters: starters,
    broodIds: starters.map((c) => c.id),
    createdTs: now,
  };
}

export function createPlayer(name: string, now: number): PlayerState {
  const p = freshState(randomUUID(), name, now);
  players.set(p.id, p);
  dbUpsert(p);
  return p;
}

/** Create a ghost (bot) rival with a custom level, brood and farmable Grist. */
export function createGhost(
  name: string,
  level: number,
  grist: number,
  brood: Critter[],
  now: number,
): PlayerState {
  const p = freshState(randomUUID(), name, now);
  p.isGhost = true;
  p.level = level;
  p.grist = grist;
  p.ghostBaselineGrist = grist;
  p.critters = brood;
  p.broodIds = brood.map((c) => c.id);
  p.leaderId = brood.find((c) => c.essence === "brimstone")?.id ?? brood[0]?.id;
  players.set(p.id, p);
  dbUpsert(p);
  return p;
}

/** Persist a (mutated) player to disk. Call after any state-changing action. */
export function savePlayer(p: PlayerState): void {
  players.set(p.id, p);
  dbUpsert(p);
}

/** Wipe a player's progress back to a fresh starter profile, keeping id + name. */
export function resetPlayer(id: string, now: number): PlayerState | undefined {
  const existing = players.get(id);
  if (!existing) return undefined;
  const reset = freshState(id, existing.name, now);
  players.set(id, reset);
  dbUpsert(reset);
  return reset;
}

/** Permanently delete a player profile. */
export function deletePlayer(id: string): boolean {
  const existed = players.delete(id);
  dbDelete(id);
  return existed;
}

export function getPlayer(id: string): PlayerState | undefined {
  return players.get(id);
}

export function allPlayers(): PlayerState[] {
  return [...players.values()];
}

/** Test helper: clear cache + table. */
export function resetStore(): void {
  players.clear();
  dbClear();
}
