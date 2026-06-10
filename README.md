# A Good Old Fashioned Adventure

A 16-bit-styled action RPG for web and Android (Capacitor), built on a fully
data-driven content pipeline: every tile, prop, sprite, palette, quest, and
line of dialogue is declarative JSON that compiles into
[Koota](https://github.com/pmndrs/koota) ECS traits and React bindings, with
[anime.js](https://animejs.com)-driven pixel-sprite animation.

The original single-file prototype lives at `kingdom_quest_rpg.tsx` and is
being decomposed into:

| Directory | What lives there |
|-----------|------------------|
| `src/config/` | Numeric tunables — movement, combat, progression, AI, audio synth recipes, UI theme |
| `src/content/palettes/` | The master palette and recolor swaps (knight/ranger/wizard are palette swaps of one hero model) |
| `src/content/sprites/` | Recolorable pixel-sprite character models (generation instructions, not baked images) |
| `src/content/tiles/` | Tile primitives as declarative draw-op layers |
| `src/content/props/` | Foreground prop primitives (chests, castle, etc.) |
| `src/content/animations/` | Named anime.js timeline specs (idle-bob, hit-flash, …) |
| `src/content/world/` | Map definitions: size, generation ops, spawn tables, trigger zones |
| `src/content/story/` | Cast registry, flags, items, quest graphs, dialogue banks with slot assignment |
| `schemas/` | JSON Schema for every content kind |
| `docs/` | Architecture and content-format specs |

Start with [`docs/CONTENT-ARCHITECTURE.md`](docs/CONTENT-ARCHITECTURE.md) —
it explains the ID system, the quest-graph format (A→…midpoints…→Z with
dialogue and item triggers), and how dialogue slots are assigned at
story-writing time without touching code.

## Status

Pre-scaffold: the content architecture and config decomposition land first;
the Vite + TypeScript + Capacitor build, the Koota runtime, and the React
bindings follow.

## License

[MIT](LICENSE)
