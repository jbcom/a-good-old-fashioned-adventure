---
title: Architecture
updated: 2026-06-11
status: current
domain: technical
---

# Architecture

Layered: **content** (JSON, schema-validated) → **sim** (pure TS, Koota
ECS, deterministic) → **presentation** (r3f world stage, DOM UI, ToneJS
audio, AnimeJS motion) → **shell** (Vite web, Capacitor Android; see
`docs/PLATFORM.md`).

```
src/config/    tunables (read-only data)
src/content/   assets, world, story (read-only data; see docs/CONTENT-ARCHITECTURE.md)
src/sim/       pure simulation: mapgen, movement, collision, combat, quests,
               events, yuka AI. No DOM, no Math.random (seeded RNG facade),
               no performance.now (clock facade).
src/render/    pixel rasterization, atlases, the r3f world stage
src/audio/     ToneJS engine built from config/audio.json recipes
src/persistence/ Drizzle schema, Capacitor SQLite save repository, Preferences settings
src/ui/        React DOM: landing, HUD, dialogue, menus, minimap, virtual pad
src/app/       composition root
```

`src/config/incremental.json` is the product loop contract. It owns currencies,
run anchors, class unlock nodes, route-pack unlocks, and the upgrade-web graph
described in `docs/INCREMENTAL-RESCUE-LOOP.md`. Runtime code reads that config
through `src/lib/config.ts`; tests enforce graph connectivity and currency
rarity before UI or sim code can rely on it.

## Renderer (decision record, 2026-06-10)

**Chosen: three.js via @react-three/fiber as the sole world renderer,
HD-2D staging. pixi.js evaluated and dropped. UI is React DOM, not
canvas.**

The decision inputs are `docs/RESEARCH-2.5D.md` (verified research) and
the two screenshot-judged spikes built from real repo content
(`docs/evidence/spike-*.png`). Why r3f wins:

1. The 2.5D extrapolation demonstrably works at quality (spike judged
   against the pixi 2D baseline): perspective depth, natural
   scale-by-depth, free z-buffer y-sorting, crisp NearestFilter pixels.
   The HD-2D pattern is commercially proven at this art style.
2. three.js ships the 16-bit machinery first-party (RenderPixelatedPass,
   frustum-snapped panning) — pixi v8 has no equivalent and its lighting
   plugin is dead (v7-pinned).
3. Sprite throughput (pixi's edge) is irrelevant at our entity counts;
   pmndrs ecosystem (r3f + koota) is one mental model.
4. One renderer beats the shared-context hybrid in complexity; DOM UI is
   sharper, more accessible, and easier to drive from playthrough tests
   than canvas UI.

Consequences / standing constraints:

- **Fixed camera yaw.** Research: Octopath caps rotation ~90° in special
  cases only. Our camera pitches over the world, follows the player,
  never rotates in normal play.
- **Crisp pipeline**: every texture NearestFilter min+mag,
  generateMipmaps=false, SRGBColorSpace; world rendered at low virtual
  resolution and integer-upscaled.
- **Android DPR**: fractional devicePixelRatio (2.625 on Pixel-class) is
  the norm — presentation layer uses integer scale + letterbox, never
  naive CSS stretch.
- Billboards: upright planes, slight back-tilt toward camera,
  alphaTest cutout, anchored at feet (sprite anchor = y-sort key =
  ground contact).

## Sim/presentation contract

Sim is the source of truth; presentation reads, never writes. React DOM
UI subscribes via koota React bindings. AnimeJS instances write only
presentation-side channels (offset/tint/alpha defined by `anim:*`
content), never sim state. Dialogue emits events; quests reduce events
into state (see CONTENT-ARCHITECTURE.md §story).

## Testing

- `tests/unit/` — node: content integrity, mapgen, sim systems, quest
  logic.
- `tests/browser/` — Vitest browser mode, playwright provider, headed
  Chromium with GPU (CI runs headless but still GPU-flagged). The
  **playthrough test** drives the real app purely through synthetic
  input (keyboard/pointer on the virtual pad) and must traverse the full
  current player journey; it grows with every feature.
- `tests/harness/playerGovernor*.ts` — a test-side GOAP player governor
  documented in `docs/PLAYER-GOVERNOR.md`. It perceives public UI, presses
  real player controls, and never writes sim state.
- Visual changes are screenshot-validated (taken AND read) before commit;
  evidence lives in `docs/evidence/`.

## Persistence

`docs/PERSISTENCE.md` is binding. Drizzle owns the SQLite schema and
`@capacitor-community/sqlite` executes runtime saves. The web build uses
`jeep-sqlite` with `public/assets/sql-wasm.wasm`, copied by
`scripts/copy-sql-wasm.mjs`; settings use `@capacitor/preferences`. The
Capacitor/SQLite web save stack is intentionally pinned and excluded from
Dependabot piecemeal upgrades because `jeep-sqlite` and `sql.js` wasm must
match exactly.

## Platform

`docs/PLATFORM.md` is binding. Capacitor Android is a committed platform target,
not a local afterthought. `pnpm cap:sync` builds the Vite bundle, copies it into
Android, and keeps native plugin metadata current. UI density uses
`@capacitor/device` plus viewport measurements so phones preserve the 80%+
gameplay-area rule without hiding tablet/foldable readouts.
