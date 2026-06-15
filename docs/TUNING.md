# Balance & Tuning Spec — *Crucible Critters*

Authoritative numbers for the prototype. These are **config-as-data** (ship as JSON/DB so we
tune without redeploys — GDD §14). All values are first-pass and meant to be playtested.
Decisions locked so far: **11 tiers · friendly PvP · no gifting**.

---

## 1. Tier power curve

`power(t) = round(25 × 2.6^(t-1))`, split into AT/DF by the critter's essence ratio.

| # | Tier | Total power | (transmute result?) |
|---|---|---|---|
| 1 | Dross | 25 | n/a — starter, uncombinable |
| 2 | Lead | 65 | ✓ |
| 3 | Tin | 170 | ✓ |
| 4 | Iron | 450 | ✓ |
| 5 | Copper | 1,150 | ✓ |
| 6 | Quicksilver | 3,000 | ✓ |
| 7 | Silver | 7,800 | ✓ |
| 8 | Gold | 20,000 | ✓ |
| 9 | Platinum | 52,000 | ✓ |
| 10 | Quintessence | 135,000 | ✓ |
| 11 | Magnum Opus | 350,000 | Evolution only |

### Essence stat split (all ratios sum to 7 → clean math)
`AT = round(power × a/7)`, `DF = round(power × d/7)`.

| Essence | a:d | Example @ Silver (7,800) |
|---|---|---|
| Brimstone | 6:1 | AT 6,686 / DF 1,114 |
| Vapor | 5:2 | AT 5,571 / DF 2,229 |
| Ember | 4:3 | AT 4,457 / DF 3,343 |
| Brine | 3:4 | AT 3,343 / DF 4,457 |
| Loam | 2:5 | AT 2,229 / DF 5,571 |
| Gleam | 1:6 | AT 1,114 / DF 6,686 |

### Grade multipliers (stack on tier power)
| Grade | Mult | How obtained |
|---|---|---|
| Normal | ×1.00 | default |
| Plus (+) | ×1.25 | ~12% chance on any successful transmute; or guaranteed via S-merge (two + → +) |
| Omega (Ω) | ×1.60 | merge two same-tier Plus criters, ~6% chance (else you get a Normal of next tier as usual) |
| Star (★) | ×2.30 | Limited Shop / events only (premium ceiling) |

**Roster size:** 6–8 critters per tier (≥1 per essence), ~**80 total** for prototype.

---

## 2. Transmutation (merge)

Combine **2 same-tier critters → 1 of the next tier**. Output essence from the 6×6 grid
(GDD §6.1). Dross & event-Uniques can't be combined.

### Success rate by result tier
| Result tier | Base | With Catalyst |
|---|---|---|
| Lead (2) – Iron (4) | 75% | 100% |
| Copper (5) – Silver (7) | 60% | 100% |
| Gold (8) – Platinum (9) | 45% | 100% |
| Quintessence (10) | 35% | 100% |
| Magnum Opus (11) | **Evolution — cannot fail** | — |

**Modifiers (additive to base, capped at 95% for non-Catalyst):** VIP +1…+6% · Relic gear
+3% · **Merge Event +15…+25%** (headline event). Rare **double-success** = jump 2 tiers at
once: 2% base (8% with Catalyst).

### Costs
| Result tier | Grist cost | Catalyst (Elixir) | Recover-on-fail (Elixir) |
|---|---|---|---|
| Lead (2) | 100 | 3 | 2 |
| Tin (3) | 400 | 3 | 2 |
| Iron (4) | 1,500 | 3 | 2 |
| Copper (5) | 6,000 | 8 | 4 |
| Quicksilver (6) | 25,000 | 8 | 4 |
| Silver (7) | 100,000 | 20 | 10 |
| Gold (8) | 450,000 | 20 | 10 |
| Platinum (9) | 2,000,000 | 60 | 30 |
| Quintessence (10) | 9,000,000 | 150 | 75 |
| Magnum Opus (11, Evolution) | 40,000,000 + materials | 300 (optional, inherits 1 trait) | — |

Grist cost reductions: VIP up to −50% (VIP 14+); class perk −25%; relic −5%.

### Failure handling
- Lose both inputs → receive **one** same-tier critter of **random essence (Slag)**.
- OR pay the **Recover** Elixir cost (above) to get your two originals back instead.
- Every failed transmute also drops **1 Residue Shard**; **10 shards → 1 Mystery Egg**
  (random tier weighted to player level). So failure is never fully dead.
- **Batch transmute** up to 50 at once (no per-item recover on batch).

### Magnum Opus Evolution (top tier, can't fail)
Consumes **1 Quintessence (kept/upgraded) + 1 Quintessence (consumed as material)** +
**40M Grist + 20 Opus Fragments + 10 Opus Essences**. Material discounts: same essence −30%,
exact same species −60%. Optional 300-Elixir special lets the result inherit one trait slot
from the material.

---

## 3. Combat resolution

Auto-resolved, no mid-fight input. All modes compare **total ATK vs total DEF** with bounded
RNG.

```
band      = 0.15                          // ±15% normal
if team contains any tier ≥ 9 critter: band = 0.25   // top tiers swingier (MW parity)
attackerRoll = totalATK × U(1-band, 1+band)
defenderRoll = totalDEF × U(1-band, 1+band)
attacker WINS if attackerRoll > defenderRoll
```
- `totalATK = Σ (fielded critters' AT) × leaderMult × buffMult (+ ATK skill points)`
- `totalDEF` symmetric on the defender's snapshot.
- **Leader mult:** Brimstone leader +1…+12% team ATK; Gleam leader +1…+12% team DEF;
  scaled by leader's tier (tier 2 → +1%, tier 11 → +12%).
- **Brood (offense/defense pool) size cap:** `maxFielded = 12 + playerLevel + 3×covenmates`,
  hard cap 120; Vapor leader adds +5…+40 on top (by leader tier).
- **Exhibition (Arena)** uses a separate registered **6-critter** team, resolved 1-on-1 in
  sequence (attacker's i-th AT vs defender's i-th DF) until one side is wiped.

---

## 4. PvP — Open Raids (friendly tuning) **[DECIDED]**

| Param | Value |
|---|---|
| Cost to raid | 1 Stamina |
| On win | steal **10% of target's UN-vaulted Grist** + 2–10 XP |
| Critter loss | **never** (no capture, no theft) |
| Vault deposit fee | **5%** (vaulted Grist is safe **and** spendable) |
| Level targeting | hit anyone ≤30 levels below, or any level above you |
| Bounty | placed when your HP hits 0; anyone may claim for a Grist prize |
| Revenge mark | 5 Elixir, 24h, ignores level cap, visible to your Coven |
| HP floor | can't be raided/raid below 25% HP |

**Ghost opponents [DIVERGENCE]:** when the live raidable pool < 8, generate "Wandering
Alchemist" ghosts from inactive snapshots, power = `attackerBroodPower × U(0.7, 1.2)`. Ghost
wins pay scaled Grist from a faucet (no real player is debited).

---

## 5. The Exhibition (ranked PvP / Arena)

| Param | Value |
|---|---|
| Format | 6v6 registered team |
| Season length | **24h** (short, for an active small group) |
| Attack resource | AP: +1 / 30 min, cap 10 |
| Reward | **Renown** by final rank: 10 / 25 / 50 / 100 / 250 / 600 / 1000 (doubled in events) |
| Rank buff | holding a top rank grants +(2…10)% team ATK for the next season |
| Seeding | bot teams fill brackets until ≥ 8 real entrants |

**Renown Shop:** eggs guaranteeing a Plus critter (tier scales with price), relics, cosmetics.

---

## 6. Bosses

Shared **1× / 10× / 50×** attack system. 50× costs **10 AP**. **Critical gauge** fills at
60 AP spent (or instantly via one 50×) → tap up to 4 weak spots for bonus combo damage.
**Warcry**: once a Coven fills the warcry bar, all attacks **×2 for 10 minutes**.

### The Aberration (World Boss)
| Param | Value |
|---|---|
| HP | `bossHP = 5,000 × serverActivePlayers × difficultyTier` (auto-scales to pop) |
| Spawn | every 2 days, 24h to defeat |
| Reward | `payout = (yourDamage / bossHP) × rewardPool` + rank bonus; **≥1 hit required** |
| Reward pool | Grist + Elixir + tier-8…10 critters/Reagents |
| Damage = | your Brood's total ATK × attackMult × critMult × warcryMult |

### Homunculus (Coven Boss)
Summonable by a Coven (cost: Grist + a Reagent). Members co-attack within 24h; rewards by
**damage share**; summoner gets a bonus. Replaces MW's Summon/Epic/Team-boss sprawl.

---

## 7. Economy

### Currencies
| Currency | Earn | Spend |
|---|---|---|
| **Grist** (soft) | apparatus income, quests, raid wins, bosses | transmute, buy critters, heal, build apparatus |
| **Elixir** (premium) | free: dailies, reagent veins, roulette, boss, attendance · paid: IAP | Catalysts, recovers, eggs, recharges, cosmetics |
| **Renown** | Exhibition placement | Renown Shop |
| **Reagents** | dailies, bosses, roulette, Guild Dungeon (Prima Materia = universal) | summon specific critters (collect N → 1) |

Elixir IAP combo bonus: charging a 1,500-Elixir pack grants +10% on up to 5 further
1,500-packs within 24h (matches MW). First purchase ever = **×2**.

### Idle income — Apparatus
Auto-collects hourly, offline-inclusive, **caps at 24h** of accrual. Cost to buy the *n*-th
of a type = `Base + (Base × 0.10 × ownedOfType)`.

| Apparatus | Grist/hr | Base cost |
|---|---|---|
| Hut | 5 | 200 |
| Bellows | 50 | 2,000 |
| Forge | 500 | 40,000 |
| Market | 1,600 | 200,000 |
| Foundry | 3,500 | 1,000,000 |
| Athanor | 8,000 | 8,000,000 |
| Grand Athanor | 18,000 | 40,000,000 |
| Philosopher's Forge | 40,000 | 200,000,000 |

**Reagent Vein** (premium drip): 1 Elixir / 6h, holds up to 4 (24h). 2nd vein costs 50
Elixir, 3rd costs 500.

### Heal
Cost to fully heal HP = `round(playerLevel² × 2)` Grist (or 1 Elixir instant). *(Tunable;
derived from MW's level-scaled heal.)*

---

## 8. Timers & caps

| Resource | Use | Regen | Base cap | Cap growth | Recharge |
|---|---|---|---|---|---|
| Energy | quests | +1 / 2 min | 20 | +2 / level | 10 Elixir → +50 (or to 100% if <50) |
| Stamina | raids / bosses | +1 / 90 s | 15 | +1 / level | 10 Elixir |
| Boss AP | boss attacks | +1 / 20 min | 10 | +VIP | refilled via Elixir |
| HP | survive raids | +1 / 60 s | 100 | +skill pts | heal (see §7) |

Level-up fully refills Energy/Stamina/HP. Essence-leader & class perks shave regen timers
(Ember→Energy, Brine→Stamina), matching MW.

---

## 9. Player progression

- **XP to reach level N:** `round(60 × N^1.5)` (e.g. L2≈170, L10≈1,897, L30≈9,859, L50≈21,213).
- **+3 skill points / level**, spendable on Attack / Defense / HP / Energy / Stamina (+1 each).
- **Build nudge [DIVERGENCE]:** UI recommends Stamina/Energy first (ATK/DEF points are dwarfed
  by even a Lead critter). **Respec:** 5,000 Grist × respec-count, or 20 Elixir.
- **maxFielded** scales per §3 combat. New quest area every **3 levels** (vs MW's 10) so the
  short 11-tier game keeps unlocking content. 8 quests/area, re-clearable 3× (rank rewards:
  Grist → 2×Grist → unique item).
- **No hard level cap**; prototype content soft-caps ~L40.

---

## 10. Gacha (eggs)

| Egg | Price | Tier floor | Tier ceiling |
|---|---|---|---|
| Crucible Egg | 1 Reagent or 5 Elixir | `max(2, ⌊level/8⌋)` | floor +3 |
| Refined Egg | 50 Elixir | `max(4, ⌊level/6⌋)` | floor +3 |
| Opus Egg | 300 Elixir | Gold (8) guaranteed | up to Quintessence (10) |

**Pity [DIVERGENCE — fairness/legal hygiene]:** 30 paid pulls without a tier ≥ 8 → next paid
pull guarantees tier ≥ 8. Odds published in-client.

---

## 11. Retention systems

- **Daily Missions:** 6 rotating tasks (do 5 quests, win 3 raids, transmute 3×, hit the
  Aberration, spin roulette, claim apparatus). Clear 5 → reward each; **clear all 6 → bonus
  10 Elixir + 1 Reagent + 1 VIP point**.
- **Attendance calendar:** 25-day, escalating (small Elixir most days, Reagents on 5/10/15/20,
  a Refined Egg on day 25). VIP ×2, VVIP ×5. Resets after day 25.
- **Lucky Roulette:** 1 free spin/day (+1 at VIP 8, scaling to +10 at VIP 20); extra spins
  10 Elixir. Prizes: Grist, Elixir (x150/x200 jackpots), VIP points, eggs.
- **VIP 1–20:** EXP +1…+50%, vein output ×2…×5, transmute fee −up to 50%, +free Aberration
  attacks, +roulette spins, +AP cap. Earned slowly via VIP points or bought.

---

## 12. Monetization (flag-gated)

`MONETIZATION_ENABLED` master flag (ship free to the group first). When on:

| Pack | Price (USD) | Elixir |
|---|---|---|
| Vial | 0.99 | 100 |
| Flask | 4.99 | 600 (+first-buy ×2) |
| Cauldron | 19.99 | 2,800 |
| Reservoir | 49.99 | 8,000 |
| Mother Lode | 99.99 | 18,000 |

Sinks (in priority of natural spend): **Catalysts/Recovers** (the transmute gamble) →
**recharges** → **eggs** → **cosmetics** (non-P2W) → **VIP / season pass**. Guardrails:
published gacha odds + pity, no real-money trading, generous free Elixir faucet.

---

## 13. Open numeric questions for playtest
- Is 2.6×/tier the right power slope, or does it make low tiers feel disposable too fast?
- 10% raid theft / 5% vault fee — verify it feels "friendly" not pointless among friends.
- Aberration HP coefficient (5,000/player) — tune once we know active count.
- Egg tier-floor divisors (level/8, /6) vs how fast players level.
- Whether the build-nudge should *hard-cap* ATK/DEF skill points instead of just advising.
