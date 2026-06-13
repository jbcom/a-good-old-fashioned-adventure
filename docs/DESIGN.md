---
title: Design
updated: 2026-06-13
status: current
domain: product
---

# Design

The game opens from a storybook landing page into the incremental rescue loop
defined in `docs/INCREMENTAL-RESCUE-LOOP.md`: New Game, Continue, Settings,
class selection, the rescue route, the rail HUD, dialogue, minimap, the toolbox,
and between-run upgrades all fit the same Errant Storybook language. The r3f stage
owns the world image; React DOM owns every player-facing control and readout.
The interface follows `docs/DESIGN-SYSTEM.md` and `src/config/ui.json` tokens;
implementation must not drift back to a generic arcade font, pure-yellow
chrome, or cyberpunk glass.

## Screen Map

- **Landing:** a separate storybook opening page owns New Game, Continue, and
  Settings before class select. It should feel like an illustrated tale
  beginning in a golden morning, with pixel vines unfurling across vellum.
- **Title / class select:** the selected unlocked class is changed with
  left/right and confirmed with A. Pointer users can press the same visible
  class buttons. Knight is the first class; ranger, rogue, bard, sorcerer, and
  later roles come from the upgrade graph.
- **Playing:** r3f stage fills the screen; the rail HUD overlays the top
  (line-vitals, wave chip, unit chips, currencies); the toolbox overlays the
  lower edge — tap a class chip then the rail to deploy a unit into the line.
- **Dialogue:** a bottom dialogue panel pauses movement, shows speaker/lines,
  and uses A for the first choice or continue.
- **Pause:** Esc/P or the slideout pause button freezes sim stepping and opens
  a compact centered menu. Resume returns to the same world state.
- **Victory / results:** rescuing the princess opens a result panel that shows
  coins, roses, and the next upgrade-graph entry point before another run begins.
  The world remains behind the result panel so the player sees where the run
  ended. A opens the upgrade graph; pointer users can press the same visible
  button.
- **Upgrade graph:** a between-run panel shows the upgrade DAG as a tiered
  list with cost, category, lock/purchased state, and the current purse —
  nodes appear in topological order, each gated on all of its prerequisite
  nodes. Up/down moves selection. A buys the selected connected node. B
  returns to results without starting a run.
- **Game over:** the slideout can retire a run into game over for
  arcade-cabinet and mobile menu parity. A starts another run.

## HUD (rail-command)

Default play must preserve at least **80% gameplay area** on phones. The HUD
commands a LINE, not a hero — it reads the fielded line, not one character:

- A top line: the **LINE-vitals** aggregate meter (the whole fielded line's hp
  summed), a **WAVE** chip (the gate's wave number), per-class **unit chips**
  (glyph + count + a live-hp pip), the three currency tokens (coins/gems/roses),
  the map name, and the speed / AUTO / menu controls.
- The **toolbox** along the lower edge: one chip per unlocked class, each
  showing how many of that class remain in the finite toolbox.
- Quest log, minimap (with the rail front-marker), and audio diagnostics live
  in a right slideout opened from the top-right menu button.
- The slideout also owns pause/resume, mute, and retire-run controls.
- Capacitor builds use the platform/device profile in `docs/PLATFORM.md`.

## Controls (rail-command)

The rail pivot replaced free movement with line command — there is no d-pad and
no per-character attack. The player DEPLOYS units, and each unit's class AI
fights on its own:

- **Deploy:** tap a toolbox class chip to arm it, then tap the rail to land a
  unit of that class into the line. The unit then advances and fights by its
  class's goal evaluator (the GOAP brain) on its own.
- **Speed:** the HUD speed button cycles the time-scale; AUTO runs the frontier
  map headlessly.
- Shop counter: up/down changes the selected listing, A buys one item, and
  B sells one owned copy of the selected item. The counter keeps the world
  visible behind it.
- Upgrade counter: between runs, up/down (or a tap) changes the selected web
  node, A buys a connected node, and B returns to results.
- **Pause / mute / retire:** the top-right slideout.

The browser playthrough drives these public controls via the CommanderGovernor
(it taps the toolbox and the rail). It may observe DOM HUD telemetry, but never
mutates the Koota world directly.

## Runtime UX Rules

- Sim remains authoritative. UI may read traits and outbox side effects; it
  never writes quest/combat state directly.
- Audio (howler.js, the purchased library) starts only after a user gesture,
  then plays configured SFX and current map BGM from `src/config/audio.json`.
- Mute is immediate and persistent for the current run.
- Visual style targets FF7-era/HD-2D diorama craft, not emulator filters; CRT
  scanlines are intentionally absent.
- Typography, role colors, panel frames, and menu motion come from the Errant
  Storybook design language before component-level styling.
- Dialogue nodes emit events; quest reducers own every flag, item, map, rescue,
  results, and upgrade mutation.
- Visual validation requires a headed browser screenshot that is read before a
  change is considered complete.

## World Art Vocabulary

The root prototype is a baseline, not a ceiling. It already established
outlined sprites, shine pixels, cobblestone marks, plank bridges, mountain snow
caps, chests, castles, projectile sparks, and palette-swapped roles. The
content rewrite must keep that specificity and raise it:

- No required terrain tile should be a single flat fill. Grass, path, sand,
  water, stone, wall, and bridge tiles need at least a ground color, a shadow
  mark, and authored detail pixels.
- Repeated exterior terrain should be built from terrain families, not one
  token tile. Grass, path, leaf litter, sand, castle road, and village cobble
  require four to eight precise 16-bit variants arranged by deterministic
  chunks, so the road reads as patched ground rather than noise or flat carpet.
- Hubs must tell the story visually. A village needs facade props, trees,
  roadside furniture, and interior furniture before it can be considered a
  real place.
- Shops, taverns, and cottages need at least one NPC or object interaction.
  A labeled room with a chest is not enough adventure content.
- Shop rooms need visible merchandise, counter props, and a talkable customer
  or keeper line before the economy UI can count as finished content.
- Props should use pixel rows or layered draw ops with outlines, highlights,
  and role colors. Flat CSS rectangles and anonymous filler props do not count.
- Palette swaps are allowed for classes and monsters, but important places and
  NPC roles need silhouette differences over time.
