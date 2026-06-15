import { randomUUID } from "node:crypto";
import type { Critter, EssenceId, Grade, Tier } from "@cc/engine";

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
  // economy
  apparatus: Record<string, number>;
  lastClaimTs: number;
  // collection
  critters: Critter[];
  leaderId?: string;
  broodIds: string[]; // critters fielded for offense/defense
  createdTs: number;
}

const players = new Map<string, PlayerState>();

export function newCritter(tier: Tier, essence: EssenceId, grade: Grade = "normal"): Critter {
  return { id: randomUUID(), speciesId: `${essence}-t${tier}`, tier, essence, grade };
}

export function createPlayer(name: string, now: number): PlayerState {
  const id = randomUUID();
  // Seed a starter brood: 2 Lead of three essences (so the player can transmute immediately).
  const starters: Critter[] = [
    newCritter(2, "ember"),
    newCritter(2, "ember"),
    newCritter(2, "brine"),
    newCritter(2, "brine"),
    newCritter(2, "loam"),
    newCritter(2, "loam"),
  ];
  const p: PlayerState = {
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
    apparatus: { hut: 1 },
    lastClaimTs: now,
    critters: starters,
    broodIds: starters.map((c) => c.id),
    createdTs: now,
  };
  players.set(id, p);
  return p;
}

export function getPlayer(id: string): PlayerState | undefined {
  return players.get(id);
}

export function allPlayers(): PlayerState[] {
  return [...players.values()];
}

export function resetStore(): void {
  players.clear();
}
