import { randomUUID } from "node:crypto";
import { dbGetMeta, dbSetMeta } from "./db.js";

export type EventType = "merge_success" | "double_grist" | "boss_frenzy";

export interface GameEvent {
  id: string;
  type: EventType;
  name: string;
  /** merge_success: additive success bonus (0.2 = +20%). others: a multiplier (2 = x2). */
  value: number;
  startsAt: number;
  endsAt: number;
}

const KEY = "events";
const MERGE_BONUS_CAP = 0.4;

function load(): GameEvent[] {
  return dbGetMeta<GameEvent[]>(KEY) ?? [];
}

function save(list: GameEvent[]): void {
  dbSetMeta(KEY, list);
}

/** Active events now; prunes anything fully expired as a side effect. */
export function activeEvents(now: number): GameEvent[] {
  const all = load();
  const live = all.filter((e) => e.endsAt > now);
  if (live.length !== all.length) save(live);
  return live.filter((e) => e.startsAt <= now && now < e.endsAt);
}

export function startEvent(
  type: EventType,
  value: number,
  name: string,
  hours: number,
  now: number,
): GameEvent {
  const list = load().filter((e) => e.endsAt > now);
  const ev: GameEvent = {
    id: randomUUID(),
    type,
    name,
    value,
    startsAt: now,
    endsAt: now + hours * 3600 * 1000,
  };
  list.push(ev);
  save(list);
  return ev;
}

export function clearEvents(): void {
  save([]);
}

/** Additive transmute success bonus from active Merge Events (capped). */
export function mergeSuccessBonus(now: number): number {
  const sum = activeEvents(now)
    .filter((e) => e.type === "merge_success")
    .reduce((acc, e) => acc + e.value, 0);
  return Math.min(MERGE_BONUS_CAP, sum);
}

function maxMultiplier(now: number, type: EventType): number {
  const vals = activeEvents(now)
    .filter((e) => e.type === type)
    .map((e) => e.value);
  return vals.length ? Math.max(...vals) : 1;
}

export function questGristMultiplier(now: number): number {
  return maxMultiplier(now, "double_grist");
}

export function bossDamageMultiplier(now: number): number {
  return maxMultiplier(now, "boss_frenzy");
}
