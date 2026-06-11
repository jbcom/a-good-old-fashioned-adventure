# A Good Old-Fashioned Adventure

A storybook action RPG for web and Android. The game presents 16-bit pixel
designs inside an HD-2D/r3f diorama stage, with React DOM UI, ToneJS audio,
AnimeJS motion, Yuka enemy behaviors, and Capacitor Android packaging.

The original single-file prototype remains at `kingdom_quest_rpg.tsx` as
reference-only history. The current game is data-driven:

| Directory | What lives there |
| --- | --- |
| `src/config/` | Numeric tunables: movement, combat, progression, AI, audio, UI |
| `src/content/` | Tiles, props, sprites, palettes, animations, maps, story, dialogue |
| `schemas/` | JSON Schema for config and content files |
| `src/sim/` | Pure Koota/Yuka simulation systems |
| `src/render/` | r3f/three.js world stage and pixel atlas pipeline |
| `src/persistence/` | Drizzle schema, Capacitor SQLite saves, Preferences settings |
| `docs/` | Pillar docs for architecture, design, world, platform, testing |

## Commands

- `pnpm dev` - Vite dev server.
- `pnpm lint` - Biome check.
- `pnpm typecheck` - TypeScript check.
- `pnpm test` - unit/content/sim/platform tests.
- `pnpm test:browser` - headed Vitest browser suite with GPU flags locally.
- `pnpm build` - production Vite build.
- `pnpm cap:sync` - build web assets and sync Capacitor Android.
- `cd android && ./gradlew :app:assembleDebug` - native debug APK build.

## Core Docs

Start with:

- `docs/ARCHITECTURE.md`
- `docs/CONTENT-ARCHITECTURE.md`
- `docs/DESIGN.md`
- `docs/WORLD.md`
- `docs/PLATFORM.md`
- `TESTING.md`

The active long-running build directive is `.agent-state/directive.md`.

## License

[MIT](LICENSE)
