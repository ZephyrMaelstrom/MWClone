import { randomUUID } from "node:crypto";
import type { Critter, EssenceId, Grade, Tier } from "@cc/engine";
import { dbClear, dbDelete, dbLoadAll, dbUpsert } from "./db.js";

export type SkillKey = "attack" | "defense" | "hp" | "energy" | "stamina";
export type SkillAllocation = Record<SkillKey, number>;

function zeroSkills(): SkillAllocation {
  return { attack: 0, defense: 0, hp: 0, energy: 0, stamina: 0 };
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
  // progression
  skillPoints: number;
  skills: SkillAllocation;
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

// Hydrate cache from disk on startup (normalising any pre-skills records).
for (const p of dbLoadAll()) {
  if (!p.skills) p.skills = zeroSkills();
  players.set(p.id, p);
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
    skillPoints: 0,
    skills: zeroSkills(),
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
