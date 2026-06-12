---
title: Design
updated: 2026-06-11
status: current
domain: product
---

# Design

The game opens from a storybook landing page into the incremental rescue loop
defined in `docs/INCREMENTAL-RESCUE-LOOP.md`: New Game, Continue, Settings,
class selection, the rescue route, HUD, dialogue, minimap, virtual controls, and
between-run upgrades all fit the same Errant Storybook language. The r3f stage
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
  later roles come from the upgrade web.
- **Playing:** r3f stage fills the screen; HUD overlays the top and lower left;
  virtual pad overlays the lower corners for touch and browser playthroughs.
- **Dialogue:** a bottom dialogue panel pauses movement, shows speaker/lines,
  and uses A for the first choice or continue.
- **Pause:** Esc/P or the slideout pause button freezes sim stepping and opens
  a compact centered menu. Resume returns to the same world state.
- **Victory / results:** rescuing the princess opens a result panel that shows
  coins, roses, and the next upgrade-web entry point before another run begins.
  The world remains behind the result panel so the player sees where the run
  ended. A opens the upgrade web; pointer users can press the same visible
  button.
- **Upgrade web:** a between-run panel shows connected upgrade nodes as a
  spiderweb list with cost, category, lock/purchased state, and the current
  purse. Up/down moves selection. A buys the selected connected node. B
  returns to results without starting a run.
- **Game over:** the slideout can retire a run into game over for
  arcade-cabinet and mobile menu parity. A starts another run.

## HUD

Default play must preserve at least **80% gameplay area** on phones. The HUD is
a single top line:

- Class/level, HP, XP, coins, roses, and current route are compact text tokens.
- Phone widths show HP as a percentage; tablet/foldable widths also show the
  HP/XP bars.
- Quest log, minimap, and audio diagnostics live in a right slideout opened
  from the top-right menu button. They are not persistent gameplay chrome.
- The slideout also owns pause/resume, mute, and retire-run controls; those
  controls must never obscure the world unless the player explicitly pauses.
- Capacitor builds use the platform/device profile defined in
  `docs/PLATFORM.md`; CSS breakpoints remain the browser fallback.

## Controls

Keyboard and touch write into one input state consumed by the app runtime:

- Directions: Arrow keys / WASD / virtual d-pad.
- A: talk, confirm dialogue, melee/projectile attack.
- B: hold class ability; wizard blink and ranger leap fire on press, knight
  shield remains active while held.
- Shop counter: up/down changes the selected listing, A buys one item, and B
  sells one owned copy of the selected item. The counter pauses movement but
  keeps the world visible behind it.
- Upgrade counter: up/down changes the selected web node, A buys an upgrade,
  and B returns to the results view. The upgrade screen is between runs.
- Pause: Escape / P / slideout pause button.

The browser playthrough must use these public controls. It may observe DOM HUD
telemetry, but it must never mutate the Koota world directly.

Touch controls are semi-transparent overlays: d-pad bottom left, B/A bottom
right. They must not reserve layout space or shrink the world stage.

## Runtime UX Rules

- Sim remains authoritative. UI may read traits and outbox side effects; it
  never writes quest/combat state directly.
- Tone starts only after a user gesture, then plays configured SFX and current
  map BGM from `src/config/audio.json`.
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
