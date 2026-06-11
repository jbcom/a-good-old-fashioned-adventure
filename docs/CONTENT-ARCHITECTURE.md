---
title: Content Architecture
updated: 2026-06-11
status: current
domain: technical
---

# Content Architecture

Everything the game shows, plays, or narrates is declarative JSON under
`src/config/` and `src/content/`, validated by `schemas/`. Code (Koota
systems + React bindings) interprets content; it never embeds it. The
original prototype (`kingdom_quest_rpg.tsx`) hard-coded all of this inline —
this document is the decomposition contract.

## Use cases this layout serves

1. **Tune the game feel** without touching content or code → `src/config/`.
2. **Add a tile / prop / enemy / sprite** without touching code → drop a JSON
   file, reference it by ID.
3. **Recolor a character** → palettes are first-class; knight/ranger/wizard
   (and orcs, skeletons, the boss) are palette swaps over shared pixel grids.
4. **Write the story late** → quests are graphs and dialogue is slot-assigned,
   so narrative lands as data after systems are built.
5. **Generate assets with AI** → sprite/tile files are *generation
   instructions* (pixel grids + recolor channels + animation refs), the exact
   shape an asset-generation prompt should emit.

## The ID system

Every addressable thing has a namespaced ID: `tile:grass`, `prop:chest`,
`sprite:hero`, `palette:ranger`, `anim:walk-bob`, `map:overworld`,
`char:woodcutter`, `item:dungeon-key`, `flag:bridge-fixed`,
`quest:broken-bridge`, `dlgbank:woodcutter`, `trigger:castle-gate-entry`,
`dlg:woodcutter.request` (dialogue *events*). Cross-references are always by
ID, never by path — files can move freely. Content is discovered with Vite's
`import.meta.glob` over `src/content/**/*.json`; there is no manifest to
maintain.

## Layers

### `src/config/` — tunables (how the game *feels*)

`engine` (tile size, camera, render scale), `player` (base stats, i-frames),
`classes` (per-class attack + B-ability), `combat` (damage formulas,
knockback, shake), `progression` (XP curve, level-up), `drops` (loot tables,
chest contents), `enemies` (archetype stats + AI params), `incremental`
(rescue-loop anchors, coins/roses, upgrade web, class unlocks, route packs),
`audio` (synth recipes for SFX, BGM note tables), `ui` (theme tokens,
controls). Prototype-derived numbers remain source material, but the current
product contract is the incremental rescue loop in
`docs/INCREMENTAL-RESCUE-LOOP.md`.

### `src/content/palettes/` — recolorability

`base.json` is the single master palette: one printable character per color,
with a human name (these names are also the vocabulary for AI sprite
generation). `swaps.json` defines every variant as a sparse override of base.
A character "model" = pixel grid × palette, so a new enemy or hero skin is
usually a 5-line swap entry.

### `src/content/sprites/` — character models as generation instructions

Three grids cover the whole prototype cast:

| Grid | Used by |
|------|---------|
| `sprite:hero` | knight, ranger, wizard, rogue, woodcutter, companions, skeletons |
| `sprite:princess` | Princess Amber, Mage Gwydion |
| `sprite:dragon` | orcs, shamans, the wyrm, the shadow warlord |

Each sprite file declares: the pixel `rows`, the `recolorChannels` (which
palette characters a swap may legally retarget), an `anchor` (feet position —
this is the y-sort key and the future 2.5D ground-contact point), `facing`
(mirror-x), named `animations` (refs into `content/animations/`), and the
Koota `traits` the loader attaches when instantiating the sprite as an
entity.

### `src/content/tiles/` and `src/content/props/` — primitives

Tiles are flat 16×16 background cells: `solid` + a list of declarative
`drawOps` (`fill`/`rect`/`triangle`/`repeat-rect`, colors literal or
`@K` palette refs, optional `animate` ref for shimmer effects). Props are
foreground objects that y-sort with characters: pixel-grid `states`
(`closed`/`open`/…), optional `interaction` (verb + method + sfx, optionally a
dialogue bank/slot for readable props, and optionally a `feedback.anim` pulse
for inspected props), `solid` flag. The shared op vocabulary lives in
`schemas/draw-ops.schema.json`.

### `src/content/shops/` — counters and prices

A shop file owns its `shop:*` id, keeper character, display name, listing ids,
item refs, buy prices, sell prices, and transaction SFX. The shop layer never
stores inventory directly; it prices `item:*` definitions and the sim mutates
the player's `Inventory` plus common-currency trait. The current implementation
still names that trait `PlayerGold`; S9 economy work should present and persist
it as coins unless and until the internal trait is renamed. Dialogue nodes may
reference `opensShop: "shop:*"` so writers can decide when a counter appears
without hard-coding React behavior.

### `src/content/animations/` — anime.js timelines

Named, reusable timeline specs targeting logical channels (`spriteOffset`,
`spriteTint`, `spriteAlpha`, `spriteScale`, `layerOffset`). The React binding
resolves a channel to the actual rendered object. Durations encode the prototype's
implicit sine periods (e.g. walk bob = |sin(t/90ms)|·2px → 283ms loop).

### `src/content/world/maps/` — where things are

A map = size + base tile + ordered `generation` ops (the prototype's
procedural loops, made declarative) + `playerSpawn` + an entity spawn table
(refs to chars/props/enemy archetypes with positions) + `triggers` (zones,
conditional-solid gates keyed on flags) + `onEnter` actions. The
`unchosen-companions` spawn rule reproduces the prototype's "your two
unpicked classes appear as NPCs" behavior.

After the incremental pivot, maps are not assumed to be one mandatory linear
campaign. The baseline runtime route is a south-to-north princess rescue, and
existing maps are reusable route-pack material. A route pack may include a
village beat, forest branch, hazard shortcut, castle threshold, or rose-gated
interior side loop; unlock data lives in `src/config/incremental.json`, while
the authored map content stays in `src/content/world/maps`.

### `src/content/story/` — the narrative layer

- `characters.json` — the cast registry: display name, sprite, palette,
  portrait, and which dialogue bank a character speaks from.
- `flags.json` / `items.json` — world state registry and item effects.
- `quests/*.json` — **quest graphs**. A quest is `start` → any number of
  midpoint stages → terminal stage(s). Edges (`advance[]`) fire on typed
  conditions — `dialogueEvent`, `counterDone` (kill/collect counters),
  `itemAcquired`, `enemyDefeated`, `enterZone`, `flag` — and carry `effects`
  (`setFlag`, `setTile`, `spawnItem`, `startQuest`, `startDialogue`,
  `loadMap`, `endGame`, …). "A→B→C and beyond" is just more stages and more
  edges; branches are multiple `advance` entries on one stage; optional
  content hangs off `hints`. Chaining acts = `startQuest` effects.
- `dialogue/*.json` — **dialogue banks with slots**. A bank holds every node
  a speaker can say. `slots` map game state → node: evaluated top-down,
  first match wins, `default` last; a slot with an `id` is directly
  addressable (map `onEnter`, quest `startDialogue`). Nodes `emit` events
  (`dlg:woodcutter.request:accepted`) that quests listen for — dialogue
  never mutates state itself, so writers can't break the sim.

**Story-writing workflow:** add nodes to a bank → point slots at them with
`when: {quest, stage}` conditions → wire quest edges to the emitted events.
No code changes; schema validation catches dangling IDs.

## Translation to Koota + React

The loader (next work unit) turns content into:

- **Traits** — each content kind lists its Koota traits (`Transform`,
  `Sprite`, `Palette`, `Facing`, `Animator`, `Solid`, `Interactable`,
  `LootContainer`, `DepthSorted`, `Tile`, …). Loading a map spawns entities
  with those traits initialized from the JSON.
- **Sprite atlases** — at boot, each (grid × palette) pair is rasterized once
  to an offscreen canvas; renderers blit, never re-parse rows.
- **React bindings** — `useQuery`/`useTrait` drive HUD and dialogue UI;
  anime.js instances are created from `anim:*` specs and write into traits
  (offsets/tint/alpha), keeping animation declarative and the sim pure.
- **Events** — dialogue/quest/combat communicate over a typed event bus
  (`enemy:defeated`, `dlg:*`, `item:acquired`); quest graphs are reducers
  over that stream.

## Decisions (and why)

| Decision | Why |
|----------|-----|
| Roster is **knight / ranger / wizard** (rogue kept as data, `playable: false`) | Product direction: palette-swapped hero trio. Wizard inherits the bolt attack (magic) and the blink ability (from rogue's cloak, refit). |
| Added `Y` (banner gold) and `O` (ember orange) to `palette:base` | The castle and dragon grids use them but the prototype palette never defined them — silent canvas-state bug upstream. |
| `quest:broken-bridge` counter matches all three forest archetypes | Prototype counted only enemies named exactly "Forest Orc" (2 exist) toward a 4-kill quota — unwinnable as written. The four forest-family enemies are the evident intent. |
| Castle is a prop placed by the map, not a magic tile name | Prototype collision-checked `t === 'Castle'` but no grid cell ever held that value, and `drawPixelSprite` was referenced but never defined — the exported prototype doesn't run. |
| Dialogue emits events; quests own all state mutation | Writers can add/edit dialogue without being able to corrupt sim state; every state change is auditable in one place. |
| One JSON file per tile/prop/sprite/quest/bank; registries (flags, items, cast, swaps) are single files | Files are the unit of authoring and review for *content*; registries are small, cross-cutting, and benefit from one-glance completeness. |

## Validation

Every file declares `$schema` relative to `schemas/`. CI (once scaffolded)
runs ajv over `src/{config,content}/**/*.json` plus a referential-integrity
pass: every `tile:`/`palette:`/`anim:`/`char:`/`item:`/`flag:`/`quest:`/
`dlgbank:` reference must resolve, every quest `to:` must name a stage in the
same file, and every dialogue `when.quest`/`stage` pair must exist.
