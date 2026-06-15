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
  skillPoints: number;
  apparatus: Record<string, number>;
  pendingIdleGrist: number;
  critters: Critter[];
  broodIds: string[];
  leaderId?: string;
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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
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
  raid: (attacker: string, defender: string) =>
    req<{ outcome: { win: boolean; gristStolen: number }; state: PlayerState }>("POST", "/raid", {
      attacker,
      defender,
    }),
  listPlayers: () => req<{ id: string; name: string; level: number }[]>("GET", "/players"),
};
