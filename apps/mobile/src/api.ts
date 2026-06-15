import { Platform } from "react-native";
import Constants from "expo-constants";
import type { Critter } from "@cc/engine";

const configuredBase = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
  ?.apiBaseUrl;

/**
 * On web the server hosts the app itself, so call the API same-origin ("" = relative).
 * On native, use the configured apiBaseUrl (set to your LAN IP / deployed URL).
 */
const BASE_URL: string =
  Platform.OS === "web" ? "" : (configuredBase ?? "http://localhost:3000");

export interface PlayerState {
  id: string;
  name: string;
  level: number;
  xp: number;
  grist: number;
  vaultGrist: number;
  elixir: number;
  renown: number;
  reagents: number;
  residueShards: number;
  energy: number;
  stamina: number;
  hp: number;
  energyMax: number;
  staminaMax: number;
  hpMax: number;
  bossAp: number;
  bossApMax: number;
  energyNext: number; // seconds to next +1 energy
  staminaNext: number;
  hpNext: number;
  bossApNext: number;
  pity: number;
  attendanceAvailable: boolean;
  rouletteAvailable: boolean;
  skillPoints: number;
  skills: { attack: number; defense: number; hp: number; energy: number; stamina: number };
  apparatus: Record<string, number>;
  gristPerHour: number;
  pendingIdleGrist: number;
  critters: Critter[];
  broodIds: string[];
  leaderId?: string;
  covenId?: string;
  maxFielded: number;
  bossDamageTotal: number;
}

export interface CovenView {
  id: string;
  name: string;
  code: string;
  leaderId: string;
  members: { id: string; name: string; level: number; power: number }[];
  boss: { hp: number; maxHp: number; expiresAt: number } | null;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  level: number;
  isGhost: boolean;
  value: number;
}

export interface BossView {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  expiresAt: number;
  topDamagers: { name: string; damage: number }[];
}

export interface Reward {
  grist?: number;
  elixir?: number;
  reagents?: number;
  critterTier?: number;
}

export interface MissionView {
  id: string;
  label: string;
  progress: number;
  target: number;
  done: boolean;
  claimed: boolean;
  reward: Reward;
}

export interface DailyView {
  missions: MissionView[];
  attendanceAvailable: boolean;
  rouletteAvailable: boolean;
  attendanceDay: number;
}

export type EggType = "crucible" | "refined" | "opus";

export type EventType = "merge_success" | "double_grist" | "boss_frenzy";

export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  value: number;
  startsAt: number;
  endsAt: number;
}

export type SkillKey = "attack" | "defense" | "hp" | "energy" | "stamina";

export interface ApparatusDef {
  id: string;
  name: string;
  gristPerHour: number;
  baseCost: number;
}

export interface Catalog {
  tiers: Record<string, { tier: number; name: string; power: number; combinable: boolean }>;
  essences: Record<string, { id: string; name: string; atkParts: number; defParts: number }>;
  apparatus: ApparatusDef[];
  apparatusCostGrowth: number;
  vaultFeeFraction: number;
}

export interface TransmuteOutcome {
  success: boolean;
  outcomeCritter?: Critter;
  slagCritter?: Critter;
  gristSpent: number;
  elixirSpent: number;
  shardsGained: number;
  successRateUsed: number;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Only send a JSON content-type when there's actually a body — Fastify rejects
  // an empty body that declares application/json (no-body POSTs like roulette).
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

async function adminReq<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "x-admin-token": token };
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
}

export const api = {
  createPlayer: (name: string) => req<PlayerState>("POST", "/players", { name }),
  getPlayer: (id: string) => req<PlayerState>("GET", `/players/${id}`),
  claim: (id: string) => req<{ gained: number; state: PlayerState }>("POST", `/players/${id}/claim`),
  quest: (id: string) =>
    req<{ outcome: { gristGained: number; xpGained: number; captured?: Critter }; state: PlayerState }>(
      "POST",
      `/players/${id}/quest`,
    ),
  transmute: (id: string, a: string, b: string, catalyst: boolean) =>
    req<{ outcome: TransmuteOutcome; state: PlayerState }>("POST", `/players/${id}/transmute`, {
      a,
      b,
      catalyst,
    }),
  reset: (id: string) => req<PlayerState>("POST", `/players/${id}/reset`),
  catalog: () => req<Catalog>("GET", "/catalog"),
  setBrood: (id: string, broodIds: string[], leaderId?: string) =>
    req<PlayerState>("POST", `/players/${id}/brood`, { broodIds, leaderId }),
  setLeader: (id: string, leaderId: string) =>
    req<PlayerState>("POST", `/players/${id}/leader`, { leaderId }),
  buyApparatus: (id: string, apparatusId: string) =>
    req<{ result: { cost: number; count: number }; state: PlayerState }>(
      "POST",
      `/players/${id}/apparatus`,
      { apparatusId },
    ),
  spendSkill: (id: string, stat: SkillKey) =>
    req<PlayerState>("POST", `/players/${id}/skill`, { stat }),
  vaultDeposit: (id: string, amount: number) =>
    req<{ result: { deposited: number; fee: number }; state: PlayerState }>(
      "POST",
      `/players/${id}/vault/deposit`,
      { amount },
    ),
  vaultWithdraw: (id: string, amount: number) =>
    req<PlayerState>("POST", `/players/${id}/vault/withdraw`, { amount }),
  boss: () => req<BossView>("GET", "/boss"),
  attackBoss: (id: string, mode: number) =>
    req<{
      result: { damage: number; bossHp: number; bossMaxHp: number; bossLevel: number; defeated: boolean; reward?: Reward };
      state: PlayerState;
    }>("POST", `/players/${id}/boss/attack`, { mode }),
  daily: (id: string) => req<DailyView>("GET", `/players/${id}/daily`),
  claimMission: (id: string, missionId: string) =>
    req<{ reward: Reward; state: PlayerState }>("POST", `/players/${id}/daily/claim`, { missionId }),
  attendanceClaim: (id: string) =>
    req<{ result: { day: number; reward: Reward }; state: PlayerState }>(
      "POST",
      `/players/${id}/attendance/claim`,
    ),
  rouletteSpin: (id: string) =>
    req<{ result: { prizeIndex: number; reward: Reward }; state: PlayerState }>(
      "POST",
      `/players/${id}/roulette/spin`,
    ),
  buyEgg: (id: string, type: EggType) =>
    req<{ outcome: { critter: Critter; pity: boolean }; state: PlayerState }>(
      "POST",
      `/players/${id}/egg`,
      { type },
    ),
  coven: (id: string) => req<CovenView | null>("GET", `/players/${id}/coven`),
  createCoven: (id: string, name: string) =>
    req<{ coven: CovenView | null; state: PlayerState }>("POST", `/players/${id}/coven`, { name }),
  joinCoven: (id: string, code: string) =>
    req<{ coven: CovenView | null; state: PlayerState }>("POST", `/players/${id}/coven/join`, { code }),
  leaveCoven: (id: string) =>
    req<{ coven: CovenView | null; state: PlayerState }>("POST", `/players/${id}/coven/leave`),
  summonHomunculus: (id: string) =>
    req<{ coven: CovenView | null; state: PlayerState }>("POST", `/players/${id}/coven/homunculus/summon`),
  attackHomunculus: (id: string) =>
    req<{
      result: { damage: number; bossHp: number; bossMaxHp: number; defeated: boolean; reward?: Reward };
      coven: CovenView | null;
      state: PlayerState;
    }>("POST", `/players/${id}/coven/homunculus/attack`),
  leaderboard: (type: "level" | "power" | "boss") =>
    req<{ type: string; rows: LeaderboardRow[] }>("GET", `/leaderboard?type=${type}`),
  events: () => req<GameEvent[]>("GET", "/events"),
  adminStartEvent: (
    token: string,
    body: { type: EventType; value: number; name: string; hours: number },
  ) => adminReq<GameEvent[]>("POST", "/admin/events", token, body),
  adminClearEvents: (token: string) => adminReq<GameEvent[]>("POST", "/admin/events/clear", token),
  raid: (attacker: string, defender: string) =>
    req<{ outcome: { win: boolean; gristStolen: number }; state: PlayerState }>("POST", "/raid", {
      attacker,
      defender,
    }),
  listPlayers: () =>
    req<{ id: string; name: string; level: number; isGhost: boolean }[]>("GET", "/players"),
};
