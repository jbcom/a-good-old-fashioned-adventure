---
title: Pixel Art Audit
updated: 2026-06-12
status: current
domain: creative
---

# Pixel Art Audit (SA.1 — every sheet read at zoom)

Verdicts: **clear** (ships as-is), **weak** (readable but under-detailed —
SA.2 rework), **gap** (missing breadth — SA.3 authoring).

## terrain.png (44 tiles)

| Family | Verdict | Notes |
| --- | --- | --- |
| grass variants | clear | leaf pockets, blossom flecks, good rhythm |
| road/dirt ruts | clear | stones + ruts read at game scale |
| sand | **weak** | too sparse — needs wind-scoring lines and shell flecks |
| stone/cobble | clear | worn-path variants distinct |
| mountain/peak | **weak** | flat white triangles, no shading interior — needs face shading + snow caps |
| water | clear | sparkle + reed variants good |
| dungeon brick / interior | clear | dark families read; pillar good |
| wood floors / market tiles | clear | the gold spiral rug is loud but intentional |

## characters.png (15 assets)

| Asset | Verdict | Notes |
| --- | --- | --- |
| hero + 7 pose frames | clear | consistent silhouette across walk/attack/hurt/up frames |
| princess | clear | |
| **dragon grid** | **weak** | the single most-reused grid in the game (orcs, wyrm, warlord ride its palette swaps) reads as a green smear at distance — needs a stronger head/wing silhouette and interior shading |
| priest / warlock / barbarian | clear | distinct silhouettes, readable gear |
| dread-knight / shaman / stormcaller | clear | fused identities read |

## bosses.png (6) — clear

Each miniboss is its own silhouette; the lectern shade reads hooded + tome.

## effects.png (14) — clear

Pickups and projectiles read at game scale; swing streak good.

## route-props.png (5) — clear

Crates, lantern, cart, ribbon arch all read.

## upgrades.png (29 emblems) — clear

State treatments carry the legibility; composites read fused.

## Breadth gaps (SA.3 authoring list)

1. **Trash enemies are palette swaps of two grids** (sprite:dragon,
   sprite:hero). For a deep-and-broad game every REGION needs its own enemy
   bodies: forest (orc body + raider body + shaman body), castle approach
   (sentry body), dungeon (skeleton body distinct from hero). Minimum five
   bespoke trash grids.
2. **Region prop vocabulary**: oldwood/deep-forest share generic trees;
   sunken-road needs reeds/wreck props; castle-approach needs siege litter.
   Minimum six new props.
3. **Wave/unit fx**: deploy puff, charge dust, heal glow, wither wisp —
   four fx grids (S20.2 consumes these).
4. **Map-count check**: 17 maps ship; rails exist on one. Every route map
   in the S19 loop needs its gates/waypoints AND enough tile variety to
   pass the uniqueness gates after the rail content lands.

## SA.0 itch library scan (327 packs owned)

Classification: 224 PSX/3D (wrong medium — skip), 50 pixel-2D, 28 audio.
First curation shortlist (allow-list candidates):

- **Region trash bodies (feeds SA.3 gap 1):** 2D Pixel Art Bat / Rat /
  Snake / Wild Boar / Raven / Vulture / Cobra / Owl / Squirrel sprite
  packs — animal wave enemies give each region its own bodies without
  hand-authoring every grid.
- **Music (feeds S20.3):** Retro Combat (12 battle loops), Retro Dungeon
  (12 loops), Retro Boss Battle, RPG Fantasy Tavern & Adventure, Calm Menu,
  Victory & Level Complete (24 stingers), Dark Ambient.
- **SFX (feeds S20.3):** UI Sound Effects Pack (40 interface sounds).
- **First manual import:** `public/assets/tilemaps/ground.png` (user-added)
  — autotile cliff/ledge pieces, dithered grounds, palette ramps; candidate
  source for terrain texture uplift.

Next: download the shortlist via the adapted fetcher, extract to
raw-assets/ (gitignored), curate keepers under public/assets/ with the
license-aware manifest, and style-check each against Errant Storybook
before wiring.
