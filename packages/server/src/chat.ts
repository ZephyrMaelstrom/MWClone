import { randomUUID } from "node:crypto";
import { dbGetMeta, dbSetMeta } from "./db.js";
import { GameError } from "./errors.js";

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  ts: number;
}

const WORLD_KEY = "worldChat";
const MAX_WORLD = 80;
const MAX_LEN = 200;

export function sanitize(text: string): string {
  const t = (text ?? "").toString().trim().slice(0, MAX_LEN);
  if (!t) throw new GameError("Message is empty");
  return t;
}

export function worldChat(): ChatMessage[] {
  return dbGetMeta<ChatMessage[]>(WORLD_KEY) ?? [];
}

export function postWorld(name: string, text: string, now: number): ChatMessage {
  const msg: ChatMessage = { id: randomUUID(), name, text: sanitize(text), ts: now };
  const list = worldChat();
  list.push(msg);
  dbSetMeta(WORLD_KEY, list.slice(-MAX_WORLD));
  return msg;
}
