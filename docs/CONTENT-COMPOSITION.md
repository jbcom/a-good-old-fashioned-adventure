---
title: Content Composition Rules
updated: 2026-06-11
status: current
domain: design
---

# Content Composition Rules

The world should read like an authored storybook road, not a repeated tile
carpet. These rules turn that standard into content data and tests.

## Exterior Route Windows

Mandatory exterior maps declare `composition.routeWindows`. A route window is a
player-facing slice of the generated map, usually the area a desktop or phone
camera sees while moving through a road segment.

Each route window must name:

- `label`: the authored beat in plain language.
- `zone`: tile coordinates `{ x0, y0, x1, y1 }`.
- `majorAnchors`: entity ids expected to carry the beat, such as named NPCs,
  enemies, buildings, large props, or landmark silhouettes.
- `minorProps`: smaller set dressing that breaks repetition around the beat.
- `openReason`, only when the window is intentionally sparse. Current mandatory
  route maps should not need it; use it as an explicit exception for new maps
  while the authored beat is being created, then replace it with anchors, props,
  or a route verb before accepting the slice.

## Tile Variation

No ordinary route window may be a carpet of one tile. In tests, the dominant
tile in a current mandatory exterior window must stay below the configured cap.
This catches problems like thirty grass or sand cells in a row with no authored
counterpoint.

That rule is necessary but not sufficient. A route can still look primitive if
the same base tile is repeated with only a few accent pixels. Mandatory exterior
terrain must therefore use authored terrain families:

- A terrain family has one semantic base tile such as `tile:grass`,
  `tile:path`, `tile:leaf-litter`, `tile:sand`, `tile:castle-road`, or
  `tile:village-cobble`.
- Each family used across a current mandatory exterior route needs four to
  eight hand-authored 16x16 variants. Variants may share collision semantics,
  but they need distinct pixel shapes: tufts, roots, stones, ruts, moss seams,
  wheel marks, cracked slabs, or worn cobble edges.
- Terrain variants should be authored in native `.pix` sheets, where the art is
  visible as 16-character rows. JSON `drawOps` remain acceptable for small
  generated indicators, but they are no longer the desired format for terrain
  or sprite-like art.
- Maps declare `terrainVariants` so broad generation strokes remain readable
  while deterministic noise paints the generated grid into chunks. The player
  should see patches and pockets, not per-cell static and not endless identical
  rows.
- Tests evaluate both semantic families and concrete variant ids. A window can
  use mostly one family, but it still needs visible variant variety inside that
  family before screenshot evidence can count.

## Prop Cadence

Every current mandatory route window needs at least one major anchor and at
least two minor props. A major anchor gives the player a story or silhouette to
remember; minor props give scale, craft, and variety. Shops, signs, and readable
props can contribute, but they cannot be the only recurring solution.

## Open Space

Large open spaces are allowed only when they have a narrative job: travel
between towns, exposure before a castle, recovery after a fight, or a
deliberate threshold. `openReason` must say that job clearly, and the window
must still keep some visual punctuation at its edge.

For the current mandatory route, prefer authored ordinary windows over
`openReason`. A sparse-feeling stretch should usually gain one of:

- a named NPC with a public A-button route verb.
- a readable object with dialogue, SFX, and feedback animation.
- major silhouette props that sit in the player's depth band.
- minor prop cadence that breaks the repeated tile read.

## Enforcement

`tests/unit/content-composition.test.ts` evaluates the generated tile grid and
placed entities for every declared route window. Adding a new mandatory exterior
map without composition data is a test failure.
