# Game Design Document — **Crucible Critters**

> **Status:** branding **locked** (§3); final tuning in progress (see §17). Everything here keeps the *Monster Warlord* functionality
> but is adapted for **a small group of players**, built **mobile-first (React Native or
> Flutter)**, and **monetization-ready** (the money systems exist but can be toggled off).
>
> Derived from [`RESEARCH_MONSTERWARLORD.md`](RESEARCH_MONSTERWARLORD.md). Where we
> deliberately diverge from the original, it's marked **[DIVERGENCE]**.

---

## 1. Vision & design pillars

A cozy-but-deep **collect → merge → battle** game you can dip into a few times a day. The
fun is not twitch combat — it's **the gamble of merging**, **watching numbers grow**, and
**async rivalry/cooperation** with a tight-knit group.

**Pillars**
1. **Merge is the heartbeat.** Every fusion is a risk/reward gamble; pushing the tier ladder
   is the main long-term goal.
2. **Numbers, not reflexes.** Combat auto-resolves from ATK vs DEF. Anyone can play in 60
   seconds; mastery is in team-building and economy.
3. **Async-first, small-group-friendly.** Nothing requires players online simultaneously.
   The world feels populated even with 5 players (bots/ghosts fill gaps).
4. **Three heartbeat timers** (Energy / Stamina / Boss-AP) on different cadences create
   natural multiple-check-in retention without being oppressive.
5. **Monetization-ready, fun-first.** Dual currency + gacha + VIP scaffolding is built in but
   gated behind a feature flag so we can run it free for the group first.

---

## 2. What we keep vs. change (executive summary)

| System | Keep from MW | Our change |
|---|---|---|
| Collect monsters | ✅ multiple sources | Fewer, hand-crafted monsters per tier |
| Merge 2-same-tier → next tier, RNG | ✅ core | **Compress 22 → 9 tiers**; gentler cost curve |
| Element fusion grid | ✅ steerable fusion | Keep 6 elements, same grid logic |
| ATK vs DEF combat, no real-time | ✅ | Keep; add a tiny bit of readable feedback |
| Open-world PvP + bounties + revenge | ✅ | **Snapshot PvP + ghost opponents** for small pop |
| Arena 6v6, seasons | ✅ | Shorter seasons (24h) for a small active group |
| World/Guild boss raids | ✅ | **One shared World Boss + one Guild Boss** (not 5 boss types) |
| Buildings/mines idle income | ✅ | Keep, compressed table |
| Energy/Stamina/AP timers | ✅ | Keep cadences, gentler caps, offline-friendly |
| Skill points | ✅ | Keep, but auto-suggest the "don't dump ATK/DEF" meta |
| Alliances + Guilds | ✅ | **Merge into one "Pack" system** for simplicity |
| Dual currency + gacha + VIP | ✅ | Keep, behind monetization flag |
| Player trading | ❌ none in MW | **[DIVERGENCE]** consider limited gifting (open Q, §17) |

---

## 3. Branding & theme — **LOCKED: *Crucible Critters***

**The fantasy:** you're an **alchemist** running a back-room laboratory, capturing strange
little **critters** (half-creature, half-substance) and **fusing them in a bubbling crucible**
to transmute them up the ladder of refinement — chasing the legendary top-tier beast. The
merge *is* an alchemical gamble: the brew transmutes beautifully... or curdles into slag.

**Tone:** cozy-creepy — ~80% warm candlelit apothecary whimsy, ~20% mad-science danger.
**Art:** illuminated-manuscript-meets-apothecary; parchment UI, brass fittings, hand-inked +
watercolor critters, warm candlelight; the "danger" palette (slag, aberrations) goes cold
sickly-green. **Audio:** ambient crucible bubble + hearth crackle, glass clinks on tap, a
bright bell on successful transmutation, a wet *crack* on failure.

### 3.1 Canonical naming (use these everywhere)

| Concept | Canonical name | (generic term used elsewhere in this doc) |
|---|---|---|
| Game title | **Crucible Critters** | — |
| Creatures | **Critters** | monsters |
| Merge / fusion | **Transmutation** (in the **Crucible**) | merge/fusion |
| Sure-merge consumable | **Catalyst** | sure-merge |
| Failed-merge byproduct | **Slag** (a random same-tier critter) + **Residue shards** | fail output / fragments |
| Soft currency | **Grist** | gold |
| Premium currency | **Elixir** (a glowing potion) | gems |
| PvP currency | **Renown** | honor |
| Summon shards | **Reagents** (Universal = **Prima Materia**) | cores |
| Idle income buildings | **Apparatus** (alembics, bellows, athanors) | buildings |
| Premium-drip building | **Reagent Vein** | mine |
| Social unit | **Coven** | pack / guild / alliance |
| World boss | **The Aberration** (a transmutation gone loose) | world boss |
| Coven boss | **Homunculus** | pack boss |
| Ranked PvP | **The Exhibition** | arena |
| PvP attack | **raid a rival lab** | open-world PvP |

### 3.2 The nine tiers — the transmutation ladder (base metals → Magnum Opus)

| # | Tier | Feel |
|---|---|---|
| 1 | **Dross** | grubby slag-critters; **uncombinable** starters |
| 2 | Lead | dull, heavy |
| 3 | Tin | |
| 4 | Iron | |
| 5 | Copper | |
| 6 | Silver | critters begin to gleam, more ornate |
| 7 | Gold | radiant, majestic |
| 8 | Quintessence | crystalline, otherworldly |
| 9 | **Magnum Opus** | peak; pure radiant transmuted being; **Evolution-only** |

Critters physically **refine** in appearance as they climb (grubby → ornate → luminous).

### 3.3 The six essences (elements)

| Essence | AT:DF lean | Vibe | Leader effect |
|---|---|---|---|
| **Brimstone** | 6:1 (max attack) | volatile sulfurous red | team ATK +1–12% |
| **Vapor** | 5:2 | airy pale violet | +max critters fielded |
| **Ember** | 4:3 | warm orange | Energy regen speedup |
| **Brine** | 3:4 | teal | Stamina regen speedup |
| **Loam** | 2:5 | earthy green-brown | Grist income +5–60% |
| **Gleam** | 1:6 (max defense) | golden, holy | team DEF +1–12% |

> Steering the transmutation grid reads as **recipe-craft**: e.g. Ember + Brine → Brimstone.
> Players learn recipes to push toward **Brimstone** (offense) or **Gleam** (defense).

> **Note:** some mechanical sections below still use generic terms (monster, gold, gems,
> pack, etc.) — map them via the table in §3.1. Tier/essence names in §4 are the canon.

---

## 4. Monsters — entities, tiers, stats

### 4.1 Tiers (compressed 22 → 9) **[DIVERGENCE]**
A small group should reach endgame in **weeks, not years**, so we collapse the ladder:

| # | Tier | Role | ~Total power (AT+DF) |
|---|---|---|---|
| 1 | Dross | starter, **uncombinable** | ~25 |
| 2 | Lead | merge entry | ~70 |
| 3 | Tin | | ~200 |
| 4 | Iron | | ~550 |
| 5 | Copper | | ~1,500 |
| 6 | Silver | | ~4,200 |
| 7 | Gold | | ~12,000 |
| 8 | Quintessence | | ~34,000 |
| 9 | **Magnum Opus** | peak, **Evolution-only** | ~95,000 |

Power grows ~**2.8×/tier** (geometric, like MW but shorter). Each tier ships with **6–8
hand-designed monsters** (one+ per element) → ~60 monsters total for the prototype vs MW's
542. **[DIVERGENCE: curation over volume.]**

### 4.2 Grade variants (kept)
Stack on top of tier, like MW: **Normal → Plus (+) (+25%) → Omega (Ω) (+60%, merge-only,
low odds) → Star (★) (×2.3, premium/event-gated).** Prototype can ship Normal + Plus only;
Omega/Star are post-MVP.

### 4.3 Stats & elements
- **Two stats: Attack (AT) / Defense (DF).** No per-monster XP/level — **tier = level.**
- **6 elements** with fixed AT:DF lean + a leader effect (identical roles to MW):

  | Essence | AT:DF | Leader effect (scales with leader power) |
  |---|---|---|
  | Brimstone | 6:1 | team ATK +1–12% |
  | Vapor | 5:2 | +max critters fielded |
  | Ember | 4:3 | Energy regen speedup |
  | Brine | 3:4 | Stamina regen speedup |
  | Loam | 2:5 | Grist income +5–60% |
  | Gleam | 1:6 | team DEF +1–12% |

- **No combat element advantage** (same as MW) — elements matter for stat lean, leaders, and
  fusion steering only. Keeps combat math simple and honest.

### 4.4 Data shape (monster)
```
Monster {
  id, speciesId, tier (1-9), element, grade (normal|plus|omega|star),
  baseAT, baseDF,             // derived from tier × element ratio × grade multiplier
  ownerId, isLeader, inDefenseTeam, inArenaTeam
}
Species { id, name, element, tier, art, flavor }   // catalog/codex entry
```

---

## 5. Acquisition (how players get monsters)

Keep MW's funnel, trimmed:
1. **Quest capture** — primary early source (Energy-gated). Chance-to-capture per quest.
2. **Eggs / gacha** (premium-ready): Basic Egg (soft-currency or low premium, tier floor
   scales with player level), Rare Egg, Legendary Egg (guarantees high tier). Pity counter
   **[DIVERGENCE — modern fairness]**.
3. **Cores / shards** — collect N → summon a specific monster (great for events & targeted
   chase). Universal Cores substitute for any.
4. **Merging** (see §6).
5. **Boss / Arena drops.**
6. **Event monsters** (limited, uncombinable "Unique" class).

**No open trading** (MW parity); limited gifting is an open question (§17).

---

## 6. Merging / fusion — **the core system**

### 6.1 Rules (kept from MW)
- Combine **2 monsters of the same tier → 1 of the next tier**. Common can't combine.
- **Output element** from the fixed 6×6 grid (same+same = same; cross-element steers toward
  a target — Shadow for offense, Light for defense). Grid below (matches MW logic):

  ```
  base \ partner →  Wind  Shadow Stone Flame Light Tide
  Wind             Wind  Stone  Wind  Tide  Flame Light
  Shadow           Stone Shadow Shadow Light Tide  Flame
  Stone            Wind  Shadow Stone  Flame Light Tide
  Flame            Tide  Light  Flame  Flame Stone Shadow
  Light            Flame Tide   Light  Stone Light Wind
  Tide             Light Flame  Tide   Shadow Wind  Tide
  ```
  *(Derived from MW's grid; final values are tunable — symmetry: A+B == B+A.)*

### 6.2 Success rates **[DIVERGENCE — tuned for 9 tiers]**
| Result tier | Base success |
|---|---|
| Uncommon–Epic (2–4) | 75% |
| Legend–Ancient (5–7) | 55% |
| Godlike (8) | 40% |
| Ascendant (9) | **Evolution only — can't fail** (consumes a 2nd Godlike + materials) |

- **Special/"sure" merge = 100%**, paid in premium currency (monetization hook).
- **Boosts:** VIP +1–6%, gear/relic +3%, **Merge Events** +15–25% (the main spend/excitement
  trigger).

### 6.3 Failure handling (kept)
On fail: lose both inputs → receive **one** same-tier monster of **random element**. Player
may pay premium to **recover** originals instead. Failures also drop **shard fragments**
(N fragments → free egg) so failure never feels totally dead.

### 6.4 Quality-of-life (kept/added)
- **Batch merge** (up to 50) for grinding low tiers.
- **Plus (S-merge):** two Plus monsters → guaranteed Plus result.
- **Cost curve (gold):** gentle low-end, geometric high-end (tunable):
  Uncommon 100 → Rare 500 → Epic 2.5K → Legend 12K → Mythic 60K → Ancient 300K →
  Godlike 1.5M. Special-merge premium cost climbs in parallel (5 → ~250).

---

## 7. Combat

All modes auto-resolve from **total ATK vs total DEF** with bounded RNG. **[DIVERGENCE]** we
add lightweight *readable feedback* (a per-monster clash animation/log) so it's not a pure
black box — but **no player input mid-fight**, preserving the genre.

### 7.1 Resolution formula (proposed, explicit — MW never published one)
```
attackerRoll = totalATK × rand(0.85, 1.15)
defenderRoll = totalDEF × rand(0.85, 1.15)
attacker wins if attackerRoll > defenderRoll
variance band widens to ±25% at tiers 8–9 (matches MW "top tiers more random")
```
`totalATK = Σ fielded monsters' AT × leader/buff multipliers (+ ATK skill points)`.

### 7.2 Modes
- **PvE Quests** (Energy): the leveling/capture engine. New quest area every few player
  levels; areas re-clearable for escalating rewards.
- **PvP — Open Raids** (Stamina): attack other players' **stored defense snapshots**
  **[DIVERGENCE: snapshot not live]**. Win → steal a slice of their *carried* gold (scales
  with target level) + XP. **Bounty** on KO; **Revenge** marking for you + Pack.
  - **Ghost opponents** **[DIVERGENCE]**: when the live pool is thin, fill the attack list
    with scaled bots so PvP always has targets.
- **Arena** (ranked, AP): **6v6**, registered team, **24h seasons** (shorter than MW's 48h
  for a small active group), placement → currency + a temporary team buff. Seeded with bot
  teams at low population.
- **World Boss** (shared, server-wide): everyone chips the same HP pool with **1×/10×/50×**
  attacks; reward = `(yourDamage / bossHP) × pool` + rank. The main cooperative event.
- **Pack Boss** (our merged guild-boss): summonable by a Pack; members co-attack; rewards by
  damage share. Replaces MW's Summon/Epic/Team boss sprawl with **one** social raid.

---

## 8. Economy & currencies

### 8.1 Currencies
- **Grist** (soft): apparatus, quests, raid theft, bosses → spent on transmuting, critters,
  healing, apparatus. **Vault** protects raidable Grist; **[DIVERGENCE]** lower the infamous
  20% fee to ~**5%** (MW's 20% was widely hated), and vaulted Grist *is* spendable.
- **Elixir** (premium): start with a free grant; earnable free via dailies/reagent-veins/
  roulette/boss; **buyable with cash** (combo bonus on stacked purchases). Spent on eggs,
  Catalysts (sure-transmutes), recharges, recovers, cosmetics.
- **Renown** (PvP currency) and **Reagents** (summon shards) as secondary points.

### 8.2 Idle income (buildings + mines, NOT monsters — MW parity)
Buildings auto-collect hourly (offline-inclusive), cost `Base + Increase × owned`. Compressed
table (tunable):

| Building | G/hr | Base cost |
|---|---|---|
| Hut | 5 | 200 |
| Mill | 50 | 2,000 |
| Forge | 500 | 40,000 |
| Market | 1,600 | 200,000 |
| Castle | 3,500 | 1,000,000 |
| Temple | 8,000 | 8,000,000 |

**Mines** = passive **Gems** on a timer (e.g., a small drip every few hours; speed-up with
premium). Caps offline accrual at ~24h so players still check in.

### 8.3 Timers (kept cadences, gentler caps)
| Resource | Use | Regen | Notes |
|---|---|---|---|
| Energy | quests | +1 / 2 min | refills on level-up |
| Stamina | PvP / boss | +1 / 90 s | |
| Boss AP | boss 1×/10×/50× | +1 / 20 min | 50× costs 10 AP |
| HP | survive being raided | +1 / 60 s | can't fight below threshold |

All caps raise with player level / VIP. Recharge items cost Gems.

### 8.4 Player progression
- **+3 skill points / level** → Attack / Defense / HP / Energy / Stamina.
  **[DIVERGENCE]** UI nudges the known-optimal build (Stamina/Energy first) and offers a
  cheap respec, instead of letting new players trap themselves (MW's biggest newbie mistake).
- Each level raises **max monsters fielded** (MW tied this to allies; we tie a baseline to
  level + a bonus from Pack size).
- **No hard level cap** in design; prototype soft-caps at the content ceiling.

---

## 9. Social — unified "Pack" system **[DIVERGENCE]**

MW split this into *Alliances* (power graph) + *Guilds* (org). For a small group we **merge
them into one "Pack"**:

- **Join via invite code** (MW's alliance codes) — frictionless for a known group.
- **Pack size boosts power:** more packmates → more monsters you can field (MW's core ally
  incentive, preserved).
- **Pack Boss** co-op raids (see §7).
- **Pack vs Pack** seasonal competition (MW's Turf War) — element-rotating, winner gets a
  temporary team ATK bonus + reward chest. Optional for a single small group; shines if there
  are 2+ packs.
- **Roles:** Leader / Officer / Member.
- **Chat:** one world channel + one Pack channel. Used for banter, code-sharing, raid
  coordination.
- **Leaderboards:** level, Arena, World-Boss damage, Pack ranking — all time-boxed with
  ranking rewards. Ghost/bot entries keep boards lively at low pop.
- **Bounty / Revenge** PvP social loop (kept).

---

## 10. Retention scaffolding (kept)
- **Daily Missions** (rotating set; clear-all bonus = Gems + VIP pts + cores).
- **Attendance calendar** (escalating login rewards; VIP multiplies).
- **Daily roulette** spin.
- **Recurring events:** **Merge Event** (boosted success — the headline event), Double-Regen,
  Boss events, Core/egg-rate-up, seasonal/anniversary.
- **VIP 1–20** loyalty (EXP %, mining ×, merge-fee −, free boss attacks). Spend-tied but also
  earns slowly via free VIP points.

---

## 11. Monetization (built-in, flag-gated)
**Master flag `MONETIZATION_ENABLED`** — ship the group a free build first, flip later.

Hooks (all present in MW, modernized for fairness):
- **Gem IAP packs** (consumable) + first-purchase bonus.
- **Gacha eggs** with a **published pity counter** **[DIVERGENCE: fairness/legal hygiene]**.
- **Sure-merge / recover** sinks (the strongest natural sink — converts the merge gamble into
  spend).
- **Energy/Stamina/AP recharges** for impatient players.
- **VIP / season pass** (recurring) — better than MW's pure VIP for a small loyal group.
- **Cosmetics** (skins, profile flair) — non-pay-to-win revenue **[DIVERGENCE]**.
- **Star monsters / Limited Shop** as the premium power ceiling (keep, but ensure free players
  can still compete via merging — avoid MW's harshest paywalls).

Guardrails: no real-money trading, clear odds disclosure, generous free Gem faucet so the
small group stays engaged rather than walled out.

---

## 12. Small-group adaptations (why this works for ~5–50 players)
1. **Snapshot PvP + ghost/bot opponents** → ladders & raid lists never feel empty.
2. **Compressed 9-tier ladder + gentler costs** → satisfying endgame in weeks.
3. **One World Boss + one Pack Boss** → enough shared content without splitting a tiny pop.
4. **Unified Pack** → social systems don't fragment a small group.
5. **Server-authoritative but low-ops** → a single small backend + DB handles dozens of
   players trivially (see §14).

---

## 13. Core loops (target)
```
MINUTE:   Energy → quests (gold/XP/capture) ; Stamina → raids/boss (gold/cores/rank)
SESSION:  merge up the ladder (the gamble) → field a stronger team → collect idle income
DAY:      dailies + attendance + roulette + mine ; Pack boss ; Arena standings
LONG-ARC: steer fusion (Shadow=attack / Light=defense) → Plus/Omega/Star → top the ladder
          → win Pack-vs-Pack seasons
```

## 14. Tech architecture (prototype, mobile-first)
**Decision needed (§17): React Native vs Flutter.** Recommendation below; either works.

- **Client:** **React Native (Expo)** *(recommended — JS/TS shares types with the backend,
  fast OTA iteration for a small test group; Flutter is the alternative if we want richer
  custom animation out of the box)*. Screens: Roster/Codex, Merge, Quests, Battle/Arena,
  Boss, Shop, Pack, Profile.
- **Backend:** **server-authoritative** Node/TypeScript API (Fastify/Nest) — all combat
  rolls, merge RNG, currency mutations happen server-side (anti-cheat + consistent timers).
- **DB:** Postgres (players, monsters, packs, snapshots, events) + Redis (timers, leaderboards,
  rate-limits).
- **Realtime:** light — push/poll for boss HP & chat; full real-time not required (async game).
- **Shared types** package so client/server agree on the data model.
- **Feature flags** for `MONETIZATION_ENABLED`, events, ghost-opponents.
- **Config-as-data:** tiers, costs, drop tables, building table all in JSON/DB so we tune
  without redeploys.

## 15. Data model sketch
```
Player { id, name, level, xp, gold, gems, honor,
         energy/stamina/ap/hp (+caps), skillPoints {atk,def,hp,en,st},
         buildings[], packId, defenseSnapshot, lastSeen }
Monster { id, speciesId, tier, element, grade, ownerId, flags... }   // §4.4
Pack { id, name, code, leaderId, members[], bossState, seasonScore }
Event { id, type, multipliers, startsAt, endsAt }
LedgerEntry { playerId, currency, delta, reason, ts }   // audit every economy change
```

## 16. Prototype MVP scope (first playable)
**Goal:** the *collect → merge → battle* core, multiplayer-async, for the group. In order:

1. **Account + roster + Codex** (own monsters, see catalog).
2. **Quests (Energy) → capture + gold + XP.** ~2 areas, ~6 species across tiers 1–4.
3. **Merge system** (RNG, element grid, fail/recover, batch) — *the centerpiece*.
4. **Idle buildings** (3–4 of them) + Gold economy + simple Bank.
5. **Snapshot PvP + ghost opponents** + bounty.
6. **Player level + skill points** (with the build-nudge UI).
7. **One World Boss** (shared HP, 1×/10×/50×, damage-share rewards).
8. **Basic Pack** (invite code, roster, fielded-monster bonus) + one chat channel.
9. **Daily mission + attendance** (retention minimum).
10. **Shop + Gems** wired but `MONETIZATION_ENABLED=false`.

**Post-MVP:** Arena seasons, Pack Boss, Pack-vs-Pack, Omega/Star grades, events engine, VIP/
season pass, cosmetics, real IAP.

## 17. Open design questions (to decide together)
1. **Branding:** game name + element names + tier names + currency name + social-unit name +
   art direction (§3). *Biggest open item.*
2. **Client:** React Native (recommended) vs Flutter (§14)?
3. **Limited gifting** between packmates — yes/no? (MW had none; could boost small-group
   stickiness, but adds exploit surface.)
4. **PvP tone:** how punishing should gold-theft be among friends? (tune steal %, bank fee.)
5. **Tier count:** is 9 the right ladder length, or 7 (faster) / 11 (longer chase)?
6. **Monetization timing:** free for the group indefinitely, or plan a soft launch?
7. **Theme of the "merge" act** — biological breeding? alchemical fusion? cosmic
   summoning? (shapes art + flavor + UI metaphor).

## 18. Glossary
- **Tier** — a monster's power rank; merging climbs it.
- **Grade** — Normal/Plus/Omega/Star multiplier stacked on tier.
- **Snapshot** — a stored copy of a player's defense team used for async PvP.
- **Ghost** — a scaled bot opponent that fills thin player pools.
- **Pack** — our unified social unit (alliance + guild).
- **Sure-merge** — a 100% merge paid in premium currency.
