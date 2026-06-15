import { ESSENCE_IDS, mulberry32, type Tier } from "@cc/engine";
import { GameError } from "./errors.js";
import { type DailyState, type PlayerState, freshDaily, newCritter } from "./store.js";
import { utcDay } from "./time.js";

export interface Reward {
  grist?: number;
  elixir?: number;
  reagents?: number;
  critterTier?: Tier;
}

export function applyReward(p: PlayerState, r: Reward, rng = Math.random): void {
  if (r.grist) p.grist += r.grist;
  if (r.elixir) p.elixir += r.elixir;
  if (r.reagents) p.reagents += r.reagents;
  if (r.critterTier) {
    const e = ESSENCE_IDS[Math.floor(rng() * ESSENCE_IDS.length)]!;
    p.critters.push(newCritter(r.critterTier, e));
  }
}

// ---------------------------------------------------------------------------
// Daily missions
// ---------------------------------------------------------------------------

export interface MissionDef {
  id: string;
  label: string;
  target: number;
  metric: (d: DailyState) => number;
  reward: Reward;
}

export const MISSIONS: MissionDef[] = [
  { id: "quests3", label: "Complete 3 quests", target: 3, metric: (d) => d.quests, reward: { elixir: 3 } },
  { id: "raids2", label: "Win 2 raids", target: 2, metric: (d) => d.raidWins, reward: { elixir: 3 } },
  { id: "transmute2", label: "Transmute twice", target: 2, metric: (d) => d.transmutes, reward: { elixir: 3 } },
  { id: "boss3", label: "Hit the Aberration 3×", target: 3, metric: (d) => d.bossHits, reward: { reagents: 1 } },
];

const ALL_BONUS_ID = "all";
const ALL_BONUS: Reward = { elixir: 10, reagents: 1 };

/** Reset the daily counters if we've rolled into a new UTC day. */
export function ensureDaily(p: PlayerState, now: number): void {
  const today = utcDay(now);
  if (p.daily.date !== today) {
    p.daily = freshDaily();
    p.daily.date = today;
  }
}

/** Record progress toward daily missions. */
export function recordDaily(
  p: PlayerState,
  field: "quests" | "raidWins" | "transmutes" | "bossHits",
  now: number,
  amount = 1,
): void {
  ensureDaily(p, now);
  p.daily[field] += amount;
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

export function missionViews(p: PlayerState, now: number): MissionView[] {
  ensureDaily(p, now);
  const views = MISSIONS.map((m) => ({
    id: m.id,
    label: m.label,
    progress: Math.min(m.target, m.metric(p.daily)),
    target: m.target,
    done: m.metric(p.daily) >= m.target,
    claimed: p.daily.claimed.includes(m.id),
    reward: m.reward,
  }));
  // Synthetic "claim all" bonus once every mission is claimed.
  const allClaimed = MISSIONS.every((m) => p.daily.claimed.includes(m.id));
  views.push({
    id: ALL_BONUS_ID,
    label: "All missions bonus",
    progress: MISSIONS.filter((m) => p.daily.claimed.includes(m.id)).length,
    target: MISSIONS.length,
    done: allClaimed,
    claimed: p.daily.claimed.includes(ALL_BONUS_ID),
    reward: ALL_BONUS,
  });
  return views;
}

export function claimMission(p: PlayerState, missionId: string, now: number): Reward {
  ensureDaily(p, now);
  if (p.daily.claimed.includes(missionId)) throw new GameError("Already claimed");

  if (missionId === ALL_BONUS_ID) {
    const allClaimed = MISSIONS.every((m) => p.daily.claimed.includes(m.id));
    if (!allClaimed) throw new GameError("Claim every mission first");
    p.daily.claimed.push(ALL_BONUS_ID);
    applyReward(p, ALL_BONUS);
    return ALL_BONUS;
  }

  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) throw new GameError("Unknown mission");
  if (mission.metric(p.daily) < mission.target) throw new GameError("Mission not complete");
  p.daily.claimed.push(mission.id);
  applyReward(p, mission.reward);
  return mission.reward;
}

// ---------------------------------------------------------------------------
// Attendance (daily login calendar, 25-day cycle)
// ---------------------------------------------------------------------------

export interface AttendanceResult {
  day: number;
  reward: Reward;
}

export function attendanceClaim(p: PlayerState, now: number): AttendanceResult {
  const today = utcDay(now);
  if (p.attendance.lastClaim === today) throw new GameError("Already claimed today");
  const day = (p.attendance.day % 25) + 1;
  p.attendance.day = day;
  p.attendance.lastClaim = today;
  const reward: Reward = { elixir: 2 + day, reagents: day % 5 === 0 ? 2 : 0 };
  if (day === 25) reward.critterTier = 6 as Tier; // Quicksilver on the 25th day
  applyReward(p, reward);
  return { day, reward };
}

export function attendanceAvailable(p: PlayerState, now: number): boolean {
  return p.attendance.lastClaim !== utcDay(now);
}

// ---------------------------------------------------------------------------
// Lucky roulette (one free spin per day)
// ---------------------------------------------------------------------------

const ROULETTE_PRIZES: Reward[] = [
  { grist: 5000 },
  { elixir: 5 },
  { elixir: 15 },
  { reagents: 2 },
  { grist: 20000 },
  { elixir: 30 },
];

export interface SpinResult {
  prizeIndex: number;
  reward: Reward;
}

export function rouletteAvailable(p: PlayerState, now: number): boolean {
  return p.roulette.lastSpin !== utcDay(now);
}

export function rouletteSpin(p: PlayerState, now: number): SpinResult {
  if (!rouletteAvailable(p, now)) throw new GameError("Already spun today");
  p.roulette.lastSpin = utcDay(now);
  const rng = mulberry32((now ^ p.id.length ^ p.level) >>> 0);
  const prizeIndex = Math.floor(rng() * ROULETTE_PRIZES.length);
  const reward = ROULETTE_PRIZES[prizeIndex]!;
  applyReward(p, reward, rng);
  return { prizeIndex, reward };
}
