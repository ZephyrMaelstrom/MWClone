# Crucible Critters

An asynchronous, numbers-driven **critter collecting / transmuting / battling** game in the
lineage of Gamevil's *Monster Warlord* — an alchemist's-lab reskin tuned for a **small group
of eager players**, targeting **mobile (React Native / Flutter)** with a **monetization-ready**
economy. Capture critters, **fuse them in the crucible** to transmute up a ladder of base
metals toward the Magnum Opus, and raid rival labs.

> This repo currently contains the **design**. Code (a playable prototype) comes next —
> see [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) §16 for the MVP scope and §14 for the
> proposed architecture.

## Documents
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — the full Game Design Document (GDD).
- [`docs/TUNING.md`](docs/TUNING.md) — the authoritative balance spec (power curve,
  transmute odds/costs, combat formula, economy, timers, gacha, monetization numbers).
- [`docs/RESEARCH_MONSTERWARLORD.md`](docs/RESEARCH_MONSTERWARLORD.md) — the source research
  on the original *Monster Warlord*, with citations, that the GDD is derived from.

## Status
- [x] Deep research on the reference game
- [x] First-draft GDD
- [x] Branding / theme locked — **Crucible Critters** (GDD §3)
- [x] Mechanical tuning — 11 tiers · friendly PvP · no gifting (GDD §17, `docs/TUNING.md`)
- [ ] Client decision: React Native vs Flutter (GDD §17.5)
- [ ] Economy & combat numbers playtested
- [ ] Playable prototype (mobile)
