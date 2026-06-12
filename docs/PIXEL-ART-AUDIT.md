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
- **High Dragon boss pack (user-added, reviewed 2026-06-12):**
  Electric Lemon Games "High Dragon" + death-animation add-on, curated to
  `public/assets/bosses/dragon/` (raws in `raw-assets/itch/high-dragon/`).
  Verdict: **clear — boss-tier keeper.** 96×96 frames, clean 16-bit
  rendering with strong silhouette, interior shading, and baked drop
  shadows; 9 animations (idle/walk/melee/firebreath/fly/hover/launch with
  no-shadow airborne variants, plus a 9-frame death). Strips are 4
  consecutive direction blocks ordered right/up/left/down (left is a
  pixel-exact mirror of right); firebreath runs 16 frames per direction.
  This directly answers the characters.png dragon-grid "green smear"
  verdict **for boss-scale uses**: SA.2's dragon rework becomes "wire the
  High Dragon sheets for the boss" instead of repainting the 16px grid.
  Architecture note for the wiring step: these are pre-rendered PNG strips,
  not palette-keyed `.pix` grids, so the atlas baker needs a second source
  path (load sheet image → crop direction/frame rect → cached canvas)
  alongside `rasterizeRows`; palette swaps do NOT apply to this asset
  class, so trash-tier palette-swap consumers (orcs, wyrm, warlord) stay on
  bespoke SA.3 grids. License permits game distribution, attribution
  optional; `public/assets/MANIFEST.json` records pack, license, geometry,
  and mapped use, gated by `tests/unit/asset-manifest.test.ts`.
- **First manual imports (user-added):**
  `public/assets/tilemaps/ground.png` — "The Ground" by Backterria
  (identified from the owned library; same author as the roguelike sheet) —
  autotile cliff/ledge pieces, dithered grounds, palette ramps; terrain
  texture uplift candidate.
  `public/assets/tilemaps/roguelike.png` — "The Roguelike" v1.16.1 by
  Backterria (credit baked into the sheet corners) — a full organized 16x16
  roguelike mega-sheet with labeled category columns (terrain, fortifications,
  creatures, items, weapons, armor, tools, props): hundreds of cells; prime
  source for SA.3 region props, pickups/items, and prop breadth. Curation
  step must slice it into named regions (a slicer manifest mapping cell
  coords → asset ids) so individual cells become addressable content.

### SA.0(c) research pass — audio mapping (S20.3)

The engine today is a single ToneJS synth (`src/audio/toneEngine.ts`):
`setTheme()` plays note-loop themes from `src/config/audio.json` (8 themes:
overworld, village, interior, forest, deep-forest, sunken-road,
castle-approach, dungeon) and `playSfx()` fires 13 synth recipes (slash,
magic, dash, hurt, shield, interact, inspect, pickup, coin, levelUp,
chest, victory, rose). Downloaded pack inventories map onto that surface:

| Surface | Pack → tracks | Disposition |
| --- | --- | --- |
| dungeon, sunken-road themes | Retro Dungeon (12 loops: Ancient_Dungeon, Dark_Corridor, Echoing_Cave, Lost_Labyrinth…) | replace synth loops |
| deep-forest, castle-approach tension | Dark Ambient GLV4 (10 loops: ColdLight, ShadowRoom, LowTension, UnknowPath…) | replace synth loops |
| village, interior, overworld | Fantasy RPG GLV5 (10× 30s loops: GoldenVillage, WarmInn, RiverstoneTown, SilverForest, QuietAdventure…) | replace synth loops |
| wave/battle state (new surface) | Retro Combat (12 loops: Battle_Encounter, Dungeon_Combat, Monster_Battle, RPG_Battle_Theme…) | new: combat theme layer the synth never had |
| boss encounters (new surface) | Retro Boss Battle (miniboss, last_phase_boss, dark_overlord, prebattle_tension…) | new: boss theme layer |
| title/menu (new surface) | Calm Menu (10: calm, fantasy, mystic, soft_piano, ambient variants) | new: menu bed |
| victory, levelUp stingers | Victory & Level Complete (24 stingers: triumph, reward, levelup, complete…) | replace synth recipes |
| interact, inspect, pickup, coin, chest | UI SFX Pack (40: Click, Cancel, Coin, achievement families…) | replace where the sample reads better; A/B against synth recipe per cue |
| slash, magic, dash, hurt, shield | — no purchased coverage — | keep bespoke ToneJS recipes (combat foley stays chiptune-bright, identity-bearing) |

Integration shape: the engine grows a sample-player path (Tone.Player pool)
beside the synth path; themes/cues become config entries pointing at either
a synth recipe or a curated file under `public/assets/audio/<pack>/…` with
MANIFEST.json entries. WAV masters exist for all packs; ship OGG/MP3
(size) after a listening pass picks the keepers — full 2 GB of WAVs never
ships, only the curated subset.

### SA.0(c) research pass — animal sprite packs (SA.3 gap 1)

All ten packs are by Elthen (elthen.itch.io) — one consistent outlined
16/32-px style family, side-view sheets with idle/walk/attack/death rows,
read at zoom 2026-06-12. Every sheet is a **clear** keeper, curated to
`public/assets/enemies/` with manifest entries:

| Region | Bodies | Notes |
| --- | --- | --- |
| forest | boar, squirrel, owl | boar ships light + shaggy-dark coats — covers deep-forest too, no palette swap; owl perch rows double as oldwood ambience |
| sunken-road | snake, raven | raven is the richest sheet (hop/peck/takeoff/fly/land); perched ravens work as wreck props |
| castle-approach | vulture, cobra | vulture carrion-peck frames fit siege litter; cobra hood-flare reads elite |
| dungeon | bat, rat, naked-mole-rat | mole rat has dig rows + a bonus dirt-burrow fx sheet; rat's dark coat needs a contrast check on dungeon floors at wiring time |

Style fit: Elthen bodies are side-view (left/right via mirroring) vs the
4-direction `.pix` hero/dragon — acceptable for trash enemies that travel
lanes; bosses stay 4-directional. Frame-row semantics (which row is
walk/attack/death per sheet) get pinned in the SA.3 wiring step when each
body becomes an addressable sprite def.
