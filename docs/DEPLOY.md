# Deploying Crucible Critters (no PC required)

The server **serves the web app itself**, so there's one deployable and **one URL** your
group opens in any phone browser. The same codebase later produces an Android APK (§ APK).

## Architecture
```
[ phone browser ] ──https──> [ Render web service ]
                               ├─ GET /            → the web app (React Native Web)
                               ├─ GET /catalog     → game config
                               └─ POST /players... → game API (server-authoritative)
```
- `Dockerfile` builds the web client and starts the server.
- `render.yaml` is a one-click blueprint.

## Deploy from your phone (Render free tier)
1. Make sure this repo is on GitHub (it is).
2. On your phone browser, go to **render.com** and sign up (free).
3. **New ▸ Blueprint**, connect this repository. Render reads `render.yaml`, builds the
   Docker image, and deploys.
4. When it's live, Render gives you a URL like `https://crucible-critters.onrender.com`.
   Open it on every phone in your group and play. Share the link — that's it.

> No PC, no app store, no install.

### Free-tier caveats (fine for a small group MVP)
- **Cold start:** a free instance sleeps after ~15 min idle; the first hit wakes it (~30s).
- **Data durability:** the free plan has an **ephemeral disk**, so the SQLite file resets on
  redeploy/restart. Progress persists while the instance is alive. To make it permanent,
  add a Render **persistent disk** (mount at `/app/packages/server/data`) or switch the store
  to Postgres (small change — state is already a JSON blob per player).

## Run it locally (optional, needs Node)
```bash
pnpm install
pnpm build:web                 # exports web → packages/server/public
pnpm start                     # one URL serves app + API on :3000
```

## APK later (no PC, when you want a "real app")
Same codebase. Use **Expo EAS Build** (cloud):
1. Create a free Expo account; install nothing locally.
2. From a terminal with the repo (a PC once, or a CI runner): `eas build -p android --profile preview`.
3. EAS builds the `.apk` in the cloud; download it to your Android and install.
4. Point the native build at your deployed server: set `expo.extra.apiBaseUrl` in
   `apps/mobile/app.json` to your Render URL (native can't use same-origin like web does).

(We can add an `eas.json` and wire this when you're ready.)
