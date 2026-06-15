# Crucible Critters — Mobile Client (Expo / React Native)

The player-facing app. Talks to `@cc/server` over HTTP and shares types with `@cc/engine`.

## Screens (MVP)
- **Crucible** — the centerpiece: pick two same-tier critters, optionally add a Catalyst,
  stoke the crucible to transmute (Skia/Reanimated glowing vessel).
- **Roster** — your collection grouped by tier + total brood ATK/DEF.
- **Quest** — spend Energy to earn Grist/XP and capture critters; collect idle apparatus Grist.
- **Raid** — friendly async PvP against other labs (10% un-vaulted Grist on a win).

## Run it
1. Start the server (from repo root): `pnpm -C packages/server dev` (listens on :3000).
2. Point the app at your machine: edit `app.json` → `expo.extra.apiBaseUrl`
   (use your LAN IP, e.g. `http://192.168.1.20:3000`, when testing on a physical phone).
3. Start Expo: `pnpm -C apps/mobile start`, then open in Expo Go or a simulator.

> Note: this package needs the Expo toolchain and a simulator/device. It is scaffolded and
> shares the verified game logic in `@cc/engine`, but is not booted in CI.

## Stack
Expo SDK 52 · React Native 0.76 · `@shopify/react-native-skia` (the same Skia engine Flutter
uses) + `react-native-reanimated` for the juicy transmutation visuals.
