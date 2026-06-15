import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { GameError } from "./errors.js";
import { allPlayers, createPlayer, getPlayer, savePlayer, type PlayerState } from "./store.js";

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function findByUsername(username: string): PlayerState | undefined {
  const lower = username.toLowerCase();
  return allPlayers().find((p) => p.username?.toLowerCase() === lower);
}

function validateUsername(username: string): string {
  const u = username.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) {
    throw new GameError("Username must be 3-20 letters, numbers or underscores");
  }
  return u;
}

export interface AuthResult {
  player: PlayerState;
  token: string;
}

/** Register a new account, optionally claiming an existing guest profile (claimId). */
export function register(
  username: string,
  password: string,
  claimId: string | undefined,
  now: number,
): AuthResult {
  const u = validateUsername(username);
  if (password.length < 6) throw new GameError("Password must be at least 6 characters");
  if (findByUsername(u)) throw new GameError("That username is taken");

  // Claim an existing guest profile (no account yet) so progress isn't lost.
  let player: PlayerState | undefined;
  if (claimId) {
    const existing = getPlayer(claimId);
    if (existing && !existing.username && !existing.isGhost) player = existing;
  }
  if (!player) player = createPlayer(u, now);

  player.username = u;
  const { hash, salt } = hashPassword(password);
  player.passwordHash = hash;
  player.salt = salt;
  player.token = randomUUID();
  savePlayer(player);
  return { player, token: player.token };
}

export function login(username: string, password: string): AuthResult {
  const player = findByUsername(username);
  if (!player || !player.passwordHash || !player.salt) throw new GameError("No such account");
  if (!verifyPassword(password, player.passwordHash, player.salt)) {
    throw new GameError("Wrong password");
  }
  if (!player.token) {
    player.token = randomUUID();
    savePlayer(player);
  }
  return { player, token: player.token };
}
