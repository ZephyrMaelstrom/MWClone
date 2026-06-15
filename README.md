# Crucible Critters

An asynchronous, numbers-driven **critter collecting / transmuting / battling** game in the
lineage of Gamevil's *Monster Warlord* — an alchemist's-lab reskin tuned for a **small group
of eager players**, targeting **mobile (React Native / Flutter)** with a **monetization-ready**
economy. Capture critters, **fuse them in the crucible** to transmute up a ladder of base
metals toward the Magnum Opus, and raid rival labs.

## Monorepo layout (pnpm workspace)
```
packages/engine   @cc/engine  — shared game logic (config-as-data + pure fns), 31 tests
packages/server   @cc/server  — Fastify API + SQLite persistence + reset, 9 tests
apps/mobile       @cc/mobile  — Expo / React Native client (Crucible centerpiece)
docs/             design + tuning + research + art direction
```

## Run it
```bash
pnpm install
pnpm -r test                 # engine (31) + server (9) tests
pnpm build:web               # export web app → packages/server/public
pnpm start                   # ONE url serves the web app + API on http://localhost:3000
```
The web client + server bundle into a **single deployable** (one URL, any phone browser,
no install). Deploy from your phone via Render — see [`docs/DEPLOY.md`](docs/DEPLOY.md).
Verified here: engine/server tests pass, persistence survives restarts, the web build bundles
(426 modules) and the iOS bundle compiles (773 modules). An Android APK uses the same
codebase later (EAS Build).

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
- [x] Client decision: **React Native (Expo)** + Skia/Reanimated
- [x] MVP prototype scaffolded — engine + server verified, mobile client typechecks
- [x] SQLite persistence (survives restarts) + profile reset/delete + on-device profile id
- [x] Concept art generated + wired in (crucible, app icon, 6 essences, Magnum Opus)
- [x] Web build + single-deployable (server serves the app) + Render blueprint (`docs/DEPLOY.md`)
- [ ] Deploy to Render and share the link with the group
- [ ] Android APK via EAS Build
- [ ] Economy & combat numbers playtested
- [ ] Playable prototype (mobile)
