---
title: Design System
updated: 2026-06-11
status: current
domain: product
---

# Design System

The visual language is **Errant Storybook**: knights-errant moving through an
old illustrated tale, with the interface behaving like vellum, ink, rubric, and
aged margin ornament laid over the FF7-era/HD-2D stage. The world stays
pixel-built; the interface is not an emulator skin, not a generic arcade
cabinet, and not cyberpunk glass.

## Principles

- **Vellum over the diorama:** panels read as illuminated storybook pages,
  using parchment fields, ink borders, aged brass, ivy, and rubric red. Avoid
  neon cyan, violet glass, glow strips, and sci-fi HUD grammar.
- **Old-book type, not novelty pixel font:** headings use a storybook serif
  stack; body copy stays bookish and readable; compact HUD tokens use a narrow
  humanist stack instead of arcade monospace.
- **Diorama continuity:** pause, game over, results, and the between-run
  upgrade graph dim the world but keep it visible behind the panel. The UI
  interrupts the scene; it does not replace it.
- **Manuscript wash:** the r3f stage uses a diorama shader pass for warm vellum
  light, brown ink shade, and subtle paper grain. This is a storybook lighting
  language, not a CRT filter.
- **AnimeJS motion:** menu panels enter with short, restrained AnimeJS movement.
  CSS transitions are acceptable for simple drawer movement, but authored
  gameplay/menu motion belongs to the AnimeJS layer.

## Source Tokens

`src/config/ui.json` owns the source tokens:

- `language.id = errant-storybook`
- `typography.display` for title/result headings
- `typography.body` for dialogue and menu copy
- `typography.numeric` for HUD telemetry
- `theme.*` for role colors and panel surfaces

No component should hard-code `Press Start 2P`, `#f7e214`, neon cyan, violet
glass, or CRT/scanline effects for UI. The sprite/content palette may keep
sprite-specific yellows where the art calls for them; the app chrome uses the
Errant Storybook roles.

## Pixel Content Bar

World content is authored art. Terrain and props should preserve the prototype's
pixel grammar, then improve it with more variety: outlines, shadow pixels,
highlights, broken edges, signage, ivy, shelves, barrels, hearth/table shapes,
and recognizably different building silhouettes. A map is not visually complete
when it is mostly flat-color tile fields.

Terrain families are the base unit for exterior surface craft. A family keeps
one semantic tile id for authoring intent, then supplies four to eight concrete
16x16 variants with distinct pixel decisions. The map generator paints variants
in deterministic chunks so forest leaves form pockets, roads form ruts and
stones, village cobbles show worn paths, and desert sand breaks into wind-scored
patches.
