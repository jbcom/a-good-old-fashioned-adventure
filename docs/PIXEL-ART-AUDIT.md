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

## SA.3 census (counted 2026-06-12 against the 17 shipped maps)

| Region | Trash archetypes (body) | Distinct props | Verdict |
| --- | --- | --- | --- |
| village (5 maps) | none (peaceful) | 32 | rich |
| oldwood/deep-forest (2) | 5 humanoids ALL on sprite:dragon swaps + bramble-stalker (boar ✓) | 16 | humanoid bodies are THE gap |
| sunken-road/desert (2) | **zero** — region ships only its boss | 18 | needs trash: snake, cobra, raven ready |
| castle-approach (2) | gate-sentry (hero swap) | 7 | thin both: vulture ready; siege-litter props needed |
| castle-interior (3) | bosses only | 9 | acceptable (interior = exploration) |
| dungeon (1) | 2 hero-swap skeletons + warlord (dragon swap) | **1 (chest)** | severest prop gap; bat + rat ready |
| overworld/route (2) | reuses other regions' | 7 | follows the regions it crosses |

Census-driven order: (1) new animal trash archetypes for the empty/thin
regions — desert snake + raven, dungeon bat + rat, approach vulture — all
purchased bodies in hand; (2) dungeon + approach prop vocabulary (the
roguelike mega-sheet slicer feeds this); (3) bespoke humanoid grids
(forest orc/raider/shaman trio, skeleton, sentry) — the only gap that
still needs hand-authored .pix.

### Second user import wave (inventoried 2026-06-12, raw-assets/)

The census's remaining gaps now have purchased candidates on disk:

- **Humanoid bodies (was "the only hand-authored gap"):**
  `citizens-guards-warriors` (40 sheets: archer, 2-handed swordsman,
  sword+shield fighter in combat/non-combat sets, plus citizens + guards)
  → gate-sentry, castle guards, village ambience;
  `warriors_rogues_mages` (57 sheets: mages incl. hooded variants → forest
  shaman/thorn-shaman bodies, rogues → oldwood raiders, warriors → orc
  tier; bonus weapon-swing and elemental spell fx strips); `heavy-knight`
  (4 sheets incl. thrust/dash attacks) → elite or banner-knight uplevel.
  **Audition verdicts (read at zoom 2026-06-12): hooded mage CLEAR —
  16px outlined chibi, proportion-compatible with the .pix hero; Heavy
  Knight CLEAR — 32px elite with baked attack swooshes.** Layout note:
  these sheets are vertical 4-column strips where DIRECTIONS live on
  separate rows (RPG-Maker convention) — a third convention beside the
  dragon's direction blocks and the Elthen single-row sheets, so
  SheetAnimDef needs per-direction row addressing (directionRows:
  {right/up/left/down → row index}) before these wire up.
- **Kenney audition verdicts (2026-06-12):** Dungeon USED (floor wear
  slices, derived dark to survive the obsidian clash); Interior USED
  (candelabra/sconce/painting/shelves/archive case — lit pieces sit
  naturally in dark rooms); City REJECTED (modern era: cars, traffic
  signage — period clash with Errant Storybook); Characters REJECTED
  (modular paper-doll layers, single-frame, no skeleton bodies — crypt
  skeletons stay bespoke .pix or await a purchased skeleton pack);
  Explosion + Rune queued for the fx pass; Foliage/Brick/RTS/RPG-vector
  still pending their scale audition.
- **Kenney roguelike family** (License.txt CC0-style packs): Dungeon +
  Interior tilesheets attack the census's worst tile counts (dungeon 3
  families, interior 6); City pack (1040 tiles) feeds village/city props;
  Base + Characters extend the slicer source set.
- **FX + texture packs:** Explosion Pack (5 explosion strip sheets) feeds
  S20.2 wave fx; Rune Pack (667) feeds spell/emblem fx; Foliage packs are
  vector-scale — style-clash risk with 16-bit Errant Storybook, audition
  before any use; Brick/RPG Tiles Vector/RTS Medieval likewise need a
  scale audition first.

**(1) LANDED:** five new archetypes ship — Dune Adder + Carrion Raven
(sunken-road + desert-ruins, a region that previously had zero trash),
Gatehouse Vulture (castle-approach guard), Crypt Bat + Cellar Rat
(castle-dungeon) — wearing sprite:snake/raven/vulture/bat/rat defs with
rows pinned per sheet (snake walk = the coil row 3; raven flight row 5;
vulture swoop row 3; bat reuses its wing cycle at three speeds; rat
scurry row 2). Verified two ways: stage lineup screenshot (raven,
vulture mid-windup-swell, rat read clean beside the knight) and the
browser atlas pixel gate (every sheet sprite × every pose must crop >5%
opaque — catches dead-area row offsets deterministically, which
screenshot framing cannot). Aseprite masters regenerated for all eight
sheet defs.

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
  WIRED (docs/CONTENT-ARCHITECTURE.md §Purchased PNG sheet sprites):
  `sprite:high-dragon` (src/content/sprites/high-dragon.json) rides the
  same `sprite:*` registry with a second atlas backend (preloaded sheet
  image → direction/frame crop → cached canvas); the dragon-guardian
  archetype now renders it, verified in the real renderer
  (tests/browser/game-stage.test.tsx boss-hall screenshot, read at review:
  96px boss reads clearly against the hall, dwarfing 16px characters).
  Palette swaps do NOT apply to this asset class, so trash-tier
  palette-swap consumers (orcs, wyrm, warlord) stay on bespoke SA.3 grids. License permits game distribution, attribution
  optional; `public/assets/MANIFEST.json` records pack, license, geometry,
  and mapped use, gated by `tests/unit/asset-manifest.test.ts`.
- **First manual imports (user-added):**
  `public/assets/tilemaps/ground.png` — "The Ground" by Backterria
  (identified from the owned library; same author as the roguelike sheet) —
  autotile cliff/ledge pieces, dithered grounds, palette ramps; terrain
  texture uplift candidate.
  `public/assets/tilemaps/roguelike.png` — "The Roguelike" v1.16.1 by
  Backterria (credit baked into the sheet corners) — a full organized 16x16
  roguelike mega-sheet. Structure read at zoom (2026-06-12): **row
  categories × theme columns.** A ~62px label gutter names the category
  rows — TREES, GRASS, PLANTS, BUSHES, ROCKS, GROUND, ROADS, RAILS,
  LIQUIDS, MOUNTAINS, FARMS, BUILDINGS, CITIES, WALLS, DOORS, PROPS,
  furniture/banners/signs (unlabeled), ANIMALS, MONSTERS, HEROES, WEAPONS,
  APPAREL, ITEMS, RESOURCES, TOOLS, FOOD, UI, SPELLS — and eleven theme
  column groups run across: Fantasy, Ancient Greece, Space,
  Post-Apocalypse, PreHistoric, World Wars, Pirates, Ancient Egypt, Japan,
  CyberPunk, SteamPunk. For Errant Storybook the Fantasy column group is
  the primary slice source (dungeon + approach props, items, food), with
  Ancient Greece/Egypt ruins fragments as desert candidates. The slicer
  manifest maps named cells → tile:/prop: ids; cells are PNG crops, so
  tiles/props grow the same second raster source the sprites did
  (a sheetRect on the def → atlas crops from the preloaded image).

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
a synth recipe or a curated file. Provisional keepers are STAGED:
`public/assets/audio/music/<surface>.m4a` (13 surfaces, 128k AAC
transcoded from the WAV masters — the 8 existing themes plus menu, combat,
prebattle, miniboss, boss), `audio/stingers/{victory,levelup}.mp3`, and
`audio/ui/<cue>.mp3` (10 cue families), ~29 MB shipped vs 2 GB of raws.
Keepers were picked by track semantics; the deciding audition happens
in-game when S20.3 wires the sample path (every alternate track stays in
raw-assets/extracted/ for the A/B).

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
walk/attack/death per sheet) get pinned per sheet as each body becomes an
addressable sprite def. First wired: the boar (rows pinned from the
gridded read: idle 4f / walk 8f / attack 4f / hurt 4f per coat, light at
rows 0-3, dark at 6-9) ships as sprite:wild-boar + sprite:wild-boar-dark
with `facing.nativeDir: "left"` driving the new mirror-x path; the
Bramble Stalker archetype wears the dark coat, verified in the boss-hall
stage screenshot beside the dragon (both raster backends in one shot).
Remaining nine sheets follow the same convention as SA.3 wave content
consumes them. Rows already pinned from gridded reads (defs get authored
when the census assigns a consumer):

- **rat** (32px, 5 cols): rows 0-3 face left — idle / attack (red-eye
  lunge) / walk / hurt-flatten; rows 4-7 are pre-mirrored right-facing
  duplicates — ignore them, `facing.nativeDir: "left"` + mirror covers it.
- **bat** (16×24 cells, 5 cols): row 0 fly toward camera (red eyes),
  row 1 fly away (back view — usable as the "up" travel row), row 2
  5-frame death tumble. Front-facing flier: no nativeDir, never mirrors.

### Aseprite as the author-side surface for purchased sheets (SA.4 a/b/c)

`pnpm author:sheets` (scripts/import-sheet-sprites.mjs +
scripts/aseprite/import-sheet-sprite.lua) compiles every sheet-sprite def
into a tagged `.aseprite` master under raw-assets/aseprite/ — one frame
per sheet frame, one tag per animation (per direction block for
directional strips: the dragon master carries 233 frames / 29 tags),
durations derived from the def's fps. The aseprite MCP then serves as the
QA gate (`get_sprite_info` verified tag ranges + durations and caught a
real importer bug — appending frames at a tag boundary extends the tag;
`audit_animation` reports 0 overlaps / 0 out-of-range across all masters)
and per-tag GIF exports land in raw-assets/previews/ behind the MCP
preview server for human scrubbing. The GIF stills double-confirmed the
direction-block order (up = back view, down = camera-facing). Masters and
previews are regenerable, so both stay gitignored; the def JSON remains
the runtime source of truth.

**SA.4 adoption ledger (closed 2026-06-12):** (a) frame-import authoring
ADOPTED for purchased sheets (pnpm author:sheets, four layout
conventions compiled to tagged masters); richer .pix animation authoring
via add_frames/tweens REJECTED-for-now — the cast conversion left only
audit-clear, mostly-static .pix survivors (bosses, princess, effects,
emblems, pickups), so there is no under-animated bespoke cycle to
author. (b) audit_animation + get_sprite_info ADOPTED as the QA gate (it
caught the tag-extension importer bug). (c) preview server ADOPTED
(raw-assets/previews/ behind the MCP server). (d) palette tooling
(set_palette/remap) REJECTED-for-now — region identity now comes from
purchased BODIES, not palette families; the surviving .pix palette
pipeline is stable and needs no derivation. (e) round-trip story
DOCUMENTED: text (.pix) and def JSON are the source of truth flowing
one-way into .aseprite masters for scrubbing and QA; edits flow back by
editing the source, never the master.
