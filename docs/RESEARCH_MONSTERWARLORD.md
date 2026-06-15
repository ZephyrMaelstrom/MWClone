# Reference Research — *Monster Warlord* (Gamevil / Com2uS)

Source research underpinning our design. Compiled from multi-agent web research
(2026-06), triangulated across the Monster Warlord Fandom wiki, Gamelytic, the official
Tumblr/Facebook, GameFAQs, and community blogs. Numbers marked ⚠️ are version-dependent or
single-sourced.

---

## 0. What kind of game it is
- **Mafia-Wars-style asynchronous stat-battler** fused with a **monster collector**.
- **Menu-driven, no real-time combat** — tap an action, server resolves it by comparing
  numbers. Reviewers were mixed on feel (Pocket Gamer 2/5), but it grossed **~$1.9M/month**
  (Dec 2013) with **10M+ downloads**.
- **Launch:** Android 2012-09-18 / iOS 2012-11-01. iOS + Android, ~11 languages.
- **Not discontinued:** moved Gamevil → Com2uS Holdings; 11th anniversary Sept 2023; app
  v8.0.3 Aug 2024. Sibling titles *Fantasy Warlord* / *Three Kingdoms Warlord* did shut down.

## 1. Monsters
- **22 rarity tiers, ~542 monsters.** Low → high: Common, Uncommon, Rare, Epic, Legend,
  Ancient, Chaos, Ultimate, God, S God, SS God, Ultra God, Supreme, Elder, Outer, Infinite,
  Mystic, Eternal, Divine, Immortal, **Ragnarok** (peak); **Unique** = event-only,
  uncombinable.
- **Grade variants** stack on tier: Normal → **Plus (+)** (≈+20–70%) → **Omega (Ω)**
  (combine-only) → **Star** (≈2.3×, premium/Limited-Shop only).
- **Two stats only: Attack (AT) / Defense (DF).** No per-monster HP bar, no XP grind —
  **a monster's "level" IS its tier.** Element fixes the AT:DF ratio:

  | Element | AT:DF | Leader effect |
  |---|---|---|
  | Dark | 6:1 | team ATK +1–12% |
  | Air | 5:2 | +max monsters fielded (+50–600) |
  | Fire | 4:3 | energy cooldown −5–75s |
  | Water | 3:4 | stamina cooldown −5–60s |
  | Earth | 2:5 | gold income +5–60% |
  | Holy | 1:6 | team DEF +1–12% |

- **No elemental rock-paper-scissors in combat** — elements only affect stat lean, leader
  buffs, and fusion output.
- **Acquisition:** quest capture · shop purchase (Jewels) · eggs/gacha (Monster Egg 5💎 /
  Mysterious 50💎 / Legend 300💎 / Celestial 600💎, tier floors rise with level) · Monster
  Cores (shard-summon; Universal Core 20💎) · combining · boss/arena/team-battle drops ·
  Limited Shop (Star) · event Uniques. **No player-to-player trading.**

## 2. Merging / fusion (the core)
- Combine **2 same-tier monsters → 1 of the next tier**. Uncommon+ only. Order irrelevant.
- **Output element** via fixed 6×6 grid (same+same = same; Fire+Water = Dark, etc.).
- **Success by tier:** Ultimate & below **50%** · God–Ultra God **45%** · Supreme+ **40%** ·
  Immortal **15%**. **Special combine = 100% (Jewels).** ⚠️ Older community figures cite
  30–40% — version drift.
- **On fail:** lose both inputs → get **one** same-tier monster, **random element**; or pay
  Jewels to **recover** originals.
- **Gold cost curve** (geometric): Uncommon 100G → God 100K → SS God 10M → Ultra God 100M →
  Supreme 1B → … → Immortal 200B. Special-combine Jewel cost 5 → 1,800 in parallel.
- **Boosts:** VIP +1–6%, Ancient Armor +3%, **Combine Events** +20–35%. VIP cuts gold −50%.
- **Extras:** rare double-success jumps **2 tiers**; **batch-combine up to 100**; failures
  drop **egg fragments** (10 → free egg); **Plus** via S-Combine; **Ragnarok** via Evolution
  (can't fail; consumes a 2nd Immortal-Star + materials), not combining.

## 3. Combat (ATK vs DEF + RNG)
- **Formula:** your total ATK (monsters' AT + ATK skill pts) vs target's total DEF. Higher
  tends to win, but **stats are averages with random variance** (bigger at top tiers). No
  published closed-form equation.
- **Open-world PvP** (Stamina): attack player snapshots; win → small XP + **steal carried
  gold** (scales with target level); KO → **bounty** anyone can claim; **Alliance Revenge**
  (10💎, 24h, ignores level cap). Level rule: hit ≤30 below or any above you.
- **Arena** (ranked): **6v6**, register team, **48h seasons**, AP +1/30min, **Honor Points**
  10–1000 → Honor Shop; holding rank = 2-day team ATK buff.
- **Bosses:** **1×/10×/50× attacks** (50× = 10 AP/💎) + **critical gauge** (60 AP fills →
  tap ≤4 weak spots) + **Warcry** (10-min all-attacks-doubled).
  - Quest Boss (Energy, 6h, lvl 1→5). Summon Boss (24h, auto-invites alliance). World Boss
    (shared HP, reward = `(YourDmg/BossHP)×Reward` + rank, ≥1 hit required). Epic Boss
    (server-wide, damages you, best-per-element "Generals", scout→mid→main, MVP rewards).
    Team Battle (24h guild-vs-guild, auto best ATK/DEF per element).

## 4. Economy
- **Gold** (soft): hourly buildings, quests, PvP theft, world bosses. **Bank** protects gold
  but **20% deposit fee** (infamous).
- **Jewels** (premium): start 10 free; free via dailies/mines/roulette/boss; paid via cash
  (combo bonus +10% on stacked 1,500-Jewel charges).
- **Idle income = buildings + mines, NOT monsters.** Buildings auto-collect hourly
  (offline-inclusive), cost `Base + Increase×Owned`, from Farm (1G/hr, 40G) → Holy Temple
  (15,000G/hr, 15M). Mines = Jewels on timers (⚠️ 4h vs 8h vs ranked).
- **Timers:** Energy +2/3min (quests) · Stamina +1/2min (PvP/boss) · HP +1/90s · Battle
  Points +1/10min (max 5) · Arena AP +1/30min. Recharges 10💎.
- **Player level:** +3 skill pts/level (ATK/DEF/HP/Energy/Stamina). **Meta: never spend on
  ATK/DEF** (monsters dwarf them) → dump Stamina + Energy. Each level → +5 allies →
  **+30 deployable monsters**. New quest area every 10 levels (8 quests, completable 3×).
- **Engagement:** Daily Missions (5–8 tasks, clear-all = 10💎 + VIP + cores), 25-day
  Attendance, Lucky Roulette, **VIP 1–20** (EXP +50%, mining ×2–5, combine fee −50%, free
  boss attacks).

## 5. Social (all async)
- **Alliances** = the social graph (no separate friends). Exchange **Alliance Codes**.
  **More allies = more monsters fielded** (cap 5×level).
- **Guilds** (separate): create L20 / 100K gold, **30 cap**, 3 roles. **Turf War**
  (guild-vs-guild, element-rotating, boxes D-Copper→SS-Orichalcum, win = daily ATK bonus).
  Guild Dungeons + Guild Dungeon Boss.
- **Leaderboards:** Arena (48h), World/Epic Boss damage (percentile), Turf War. All
  time-boxed with reset + ranking rewards.
- **Chat:** World Chat (hex-color, used to spread alliance codes) + Alliance broadcast.
- **No trading/gifting** between players.

## 6. Core loops
- **Minute:** Energy→quests (gold/XP/capture); Stamina→PvP/boss (gold/cores/rank).
- **Session:** combine up the ladder → field stronger army → collect building income → push
  Arena/boss rank.
- **Day:** dailies + attendance + roulette + mines → alliance/guild boss → Arena season.
- **Long arc:** steer fusion toward Dark (attack)/Holy (defense) → chase Plus/Omega/Star →
  top the tier ladder → Turf War dominance.

## Confidence
- **High:** tier list, fusion + element grid, ATK-vs-DEF resolution, currencies, building
  table, regen rates, social/guild structure, boss types.
- **⚠️ Version-dependent / single-source:** exact combine % & costs, mine timer, Tower of
  Masters Energy-vs-Stamina, heal = Level³/10, 4 SP per 50💎, no documented level cap.

## Key sources
- Monster Warlord Fandom wiki (via `api.php`): Monster_Levels, Monster_Combinations,
  Monster_Elements, Monster_Cores, Plus_Monsters, Monster_Evolution, Beginner's_Guide, FAQ,
  Battles, Arena, Honor_Points, World_Boss(_Rewards), Epic_Boss(_Rewards), Summon_Boss,
  Team_Battle, Tower_of_Masters, Buildings_and_Mines, Jewels, VIP, Missions,
  Attendance_Login_Bonus, Lucky_Roulette, Guilds, Turf_War, Guild_Dungeon, World_Chat, Codex.
- gamelytic.com (beginner guide, combination guides), monsterwarlord.tumblr.com,
  monsterwarlordguide.blogspot.com, tipsmw.blogspot.com.
- pocketgamer.com & 148apps.com (reviews), pocketgamer.biz Charticle (revenue/downloads),
  en.namu.wiki/w/몬스터워로드 (history/servers), status.technobezz.com & customer.withhive.com
  (live status / Com2uS Holdings).
