# Art Direction — *Crucible Critters*

> **Status:** Concept art not yet generated — the Higgsfield account is on the **free plan
> with 0 credits**, so image generation is currently blocked. Add credits (or tell me to use
> another path) and these prompts are ready to one-shot. The app currently uses themed
> placeholder vector cards + a Skia-drawn crucible.

## Visual identity
- **Genre feel:** cozy-creepy alchemist's apothecary × illuminated medieval manuscript.
- **Palette:** warm candlelight — deep browns (`#1c1410`, `#2a1f17`), brass (`#c79a4b`),
  parchment (`#e8d9b5`), molten ember (`#e8743b`). **Failure/danger** shifts cold + sickly
  green (`#8fae6b`).
- **Materials:** aged brass, hand-blown glass, dark wood, wax-sealed parchment, soot.
- **Lighting:** single warm source (the crucible/hearth glow), soft shadows, slight vignette.
- **Linework:** hand-inked outlines + watercolor fills; gilt accents on higher tiers.

## Essence color keys (match `apps/mobile/src/theme.ts`)
| Essence | Color | Motif |
|---|---|---|
| Brimstone | `#c0392b` | sulfur, cracked red shell, smoke |
| Vapor | `#b39ddb` | mist, translucent, floaty |
| Ember | `#e8743b` | flame, coal, warm glow |
| Brine | `#3aa6a0` | water, brine drips, teal sheen |
| Loam | `#7a5c3a` | earth, moss, stone |
| Gleam | `#e3c45a` | gold light, halo, radiant |

## Tier refinement (critters get more ornate/luminous as they climb)
Dross → grubby, lumpy, soot-covered · Lead/Tin/Iron → dull metallic, simple · Copper/
Quicksilver/Silver → sheen, filigree begins · Gold/Platinum → ornate, gilded, regal ·
Quintessence → crystalline, glowing · Magnum Opus → pure radiant transmuted being.

---

## Ready-to-run generation prompts

Suggested model: `nano_banana_pro` (crisp, good for icon/diagram clarity) or `soul_2`
(painterly character refs). Aspect `1:1` for critter icons, `4:5` or `1:1` for the crucible.

### 1. The Crucible (hero screen centerpiece)
> "An ornate alchemist's crucible — a glowing brass cauldron on clawed feet, molten orange
> liquid bubbling inside casting warm light upward, wisps of steam, set on a dark wooden lab
> bench with glass vials and parchment, illuminated-manuscript style, hand-inked outlines and
> watercolor, cozy candlelit apothecary, deep brown background, centered, game UI hero art."

### 2. Failure state (slag)
> "Same alchemist's crucible but the brew has curdled — dull grey slag, sickly green smoke,
> cold light, cracked residue overflowing, ominous but whimsical, illuminated-manuscript
> watercolor style, dark background."

### 3. Starter critters (Dross & Lead tiers, one per essence)
Base template — swap the bracketed essence:
> "A small cute alchemical critter, [ESSENCE] essence ([COLOR/MOTIF]), half-creature
> half-substance, expressive eyes, hand-inked outline + watercolor, illuminated-manuscript
> style, simple grubby low-tier 'Dross' design, centered on transparent/dark background,
> game collectible icon, 1:1."

Concrete set to generate first (the seeded starter brood):
- **Cinderpup** — Ember Dross: "a soot-covered puppy-like critter with glowing ember eyes and
  little coal paws, warm orange."
- **Brinetoad** — Brine Dross: "a squat teal toad-like critter glistening with brine droplets,
  briny blue-green."
- **Loamling** — Loam Dross: "a mossy little earthen critter made of clay and pebbles with
  tiny sprouts, earthy brown-green."
- **Bellows Toad** — Ember Lead (next tier up): "same ember toad but dull metallic lead-grey
  refinement, slightly more ornate, puffing hot air."

### 4. App icon / splash
> "App icon: a glowing alchemist's crucible emblem with a single rising transmuted spark,
> brass and ember on deep brown, illuminated-manuscript crest style, bold, centered."

---

## How to wire generated art into the app
1. Generate, then download/import each result (e.g. `media_import_url` → bundle, or save the
   PNGs into `apps/mobile/assets/critters/<speciesId>.png`).
2. Add an `art` field to the species catalog and render it in `CritterCard` instead of the
   colored initial badge.
3. Replace the Skia placeholder vessel art in `CrucibleVessel.tsx` with the generated hero
   (keep the Reanimated pulse/glow layer on top for life).
