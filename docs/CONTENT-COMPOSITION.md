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
- `openReason`, only when the window is intentionally sparse.

## Tile Variation

No ordinary route window may be a carpet of one tile. In tests, the dominant
tile in a window must stay below the configured cap unless `openReason` explains
why the stretch is deliberately quiet. This catches problems like thirty grass
or sand cells in a row with no authored counterpoint.

## Prop Cadence

Every ordinary route window needs at least one major anchor and at least two
minor props. A major anchor gives the player a story or silhouette to remember;
minor props give scale, craft, and variety. Shops, signs, and readable props can
contribute, but they cannot be the only recurring solution.

## Open Space

Large open spaces are allowed only when they have a narrative job: travel
between towns, exposure before a castle, recovery after a fight, or a
deliberate threshold. `openReason` must say that job clearly, and the window
must still keep some visual punctuation at its edge.

## Enforcement

`tests/unit/content-composition.test.ts` evaluates the generated tile grid and
placed entities for every declared route window. Adding a new mandatory exterior
map without composition data is a test failure.
