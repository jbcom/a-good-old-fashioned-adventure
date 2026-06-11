---
title: Persistence
updated: 2026-06-11
status: current
domain: technical
---

# Persistence

The landing page is the save/load shell: **New Game**, **Continue**, and
**Settings** live before class select. The implementation uses:

- **Drizzle ORM** for schema source-of-truth and migration generation
  (`src/persistence/schema.ts`, `drizzle.config.ts`).
- **`@capacitor-community/sqlite`** for runtime save slots on web and mobile.
- **`jeep-sqlite` + `sql.js` wasm** for browser/web persistence.
- **`@capacitor/preferences`** for lightweight settings such as mute/text pace.

`scripts/copy-sql-wasm.mjs` copies `node_modules/sql.js/dist/sql-wasm.wasm` to
`public/assets/sql-wasm.wasm`. It runs in `postinstall` and `prebuild`, so Vite
and Capacitor always have a local wasm asset. Do not use CDN wasm or hosted
font assets.

`@capacitor-community/sqlite`, `@capacitor/core`, `@capacitor/preferences`,
`jeep-sqlite`, and `sql.js` are intentionally pinned and ignored by
Dependabot in `.github/dependabot.yml`. The web save stack must move as one
tested compatibility set. A live headed browser check found that floated
`sql.js@1.14.x` wasm can fail inside `jeep-sqlite@2.8.0` with a WebAssembly
import-shape `LinkError`.

Any upgrade to the pinned save stack must rerun the web save reload check:
start a run, wait for auto-save, reload, verify **Continue** is enabled, and
click Continue back into gameplay. `tests/browser/web-persistence.test.tsx`
automates this in headed Vitest browser mode against the real
`CapacitorSaveRepository`; the long playthrough tests still inject
`MemorySaveRepository` so gameplay traversal remains deterministic.

Current save slot data:

- class id
- map id
- player position
- level
- HP/max HP
- quest summary
- JSON snapshot payload for later expansion

The repository boundary is `src/persistence/saveRepository.ts`. Production uses
Capacitor SQLite. Most browser tests inject `MemorySaveRepository` so
playthroughs stay deterministic while still exercising the same app-level save
contract.
