# Continuous Work Directive — a-good-old-fashioned-adventure

**Status:** ACTIVE
**Owner:** Claude (mandated by jbogaty)
**Mandate:** "using a long-running local branch, improving and expanding your own prompt with each loop iteration, until the game is fully built. Use your own best judgement, fully autonomously, docs > tests > code, and make sure vitest browser plugin is being used with GPU-enabled headed browser tests, not just unit tests. The entire player journey start to finish needs to be fully validated as you work by constantly expanding a playthrough test that uses actual button presses (A/B / directional etc...) to emulate what the player would do. ToneJS, AnimeJS, and either r3f or pixijs depending on whether you can make 2.5D extrapolation work and VALIDATE IT with screenshots and establish it to be of the highest calibre of quality, otherwise stick with 2D. YOU are responsible for all validation of all research and all library decisions. Sounds, animation, are what are necessary. I also want you to add yukajs for enemy behaviors and make sure you add DEPTH and LENGTH to the game, with interior maps, exterior maps, a minimap, and a properly designed HUD, UI/UX"

**Branch:** `feat/content-architecture` (the long-running branch; forward commits only; PR opened once at the end).

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — task-batch + PreCompact handle it.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: docs → failing test → implement → verify (incl. screenshots for visuals) → commit → dispatch reviewers → mark [x] → backward/forward sweep → edit THIS FILE with learnings → next.
This directive IS the self-improving prompt the mandate requires: every iteration ends by refining it.

## Standing constraints
- Libraries: react, koota, animejs, tone (ToneJS), yuka, ajv. Renderer: pixi.js vs @react-three/fiber decided by S2 research + validated visual spike (screenshots, read by me). 2.5D only if highest-calibre; else 2D.
- Tests: vitest. Browser tests via @vitest/browser (playwright provider), HEADED with GPU. The playthrough test (tests/browser/playthrough.test.ts) drives the game ONLY through synthetic input (keyboard events / virtual pad pointer events) and grows with every gameplay feature. It must always pass full current journey.
- Sim purity: src/sim/** pure TS, seeded RNG facade, engine clock facade (gates.json enforces).
- All numbers from src/config, all content from src/content. Code never embeds content.
- Every visual commit: screenshot taken AND read by me before commit.

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
"pause point" | "natural pause" | "fresh session" | "next session" | "stopping point" | "clean handoff" | "ready to hand off"

## Queue — Full game build

### S1 Scaffold
- [x] S1.1 pnpm + Vite + TS + React scaffold; app boots to a canvas with menu placeholder; `pnpm dev` works
- [x] S1.2 Vitest: unit project (node) + browser project (@vitest/browser, playwright provider, headed, GPU flags); smoke test green in real Chromium
- [x] S1.3 Content integrity as tests: ajv validation of every src/{config,content} file against schemas + referential integrity (replaces the ad-hoc node script)
- [x] S1.4 Biome config; `pnpm lint`/`pnpm format` green; .gitignore covers artifacts

### S2 Renderer decision (research died with prior session — redo, validate myself)
- [x] S2.1 Research 2.5D extrapolation of 16-bit pixel art (FF7-era: pre-rendered perspective, billboards, y-sort scaling, parallax, Mode-7 planes; modern: depth maps, normal maps for pixel art); web-renderer options; write docs/RESEARCH-2.5D.md with cited findings I verified
- [x] S2.2 Build BOTH spikes: pixi 2D (y-sort + parallax + scale-by-depth "2.5D-lite") and r3f true-3D-billboard spike, render real content (hero sprite + tiles), screenshot each, READ screenshots, judge quality
- [x] S2.3 Record decision + why in docs/ARCHITECTURE.md; delete losing spike; wire winner as src/render foundation

### S3 Core runtime
- [x] S3.1 Content loader: glob-import + ajv at boot + typed registries (tiles/props/sprites/palettes/anims/maps/chars/items/flags/quests/dlgbanks)
- [x] S3.2 Koota world + traits from content `koota.traits` vocab; factories own ALL spawning; map instantiation (generation ops → grid, spawn tables → entities)
- [x] S3.3 Sim systems: clock, seeded RNG, movement+tile collision, camera follow/shake; unit tests
- [x] S3.4 Event bus (enemy:defeated, item:acquired, dlg:*, zone:entered); quest engine as reducer over events; dialogue slot resolver; unit tests for full quest chain logic
- [x] S3.5 Combat: melee swing, projectiles, damage/knockback/iframes, drops; unit tests
- [x] S3.6 Yuka enemy behaviors: yuka steering (patrol, chase/seek, flee-kite for shaman, boss charge+spread); validated in deterministic 60Hz unit sims; live browser validation folds into the S5.6 playthrough test

### S4 Presentation
- [x] S4.1 Sprite atlas baker: (grid × palette) → offscreen canvas; palette swap correctness test (pixel-compare screenshots)
- [x] S4.2 Renderer: live GameStage reconciles the Koota world per frame (ground recompose on rev bump, billboards via atlas, hit-flash frames, pickups/projectiles, camera follow); screenshots judged, evidence committed
- [x] S4.3 AnimeJS bindings: walk-bob, hit-flash, pickup-bob, trail-fade driven from anim:* content; visible in browser test
- [x] S4.4 ToneJS audio engine: synth SFX from audio.json recipes + BGM sequencer (themes, per-map switch); browser test asserts Tone engine state through the app HUD
- [x] S4.5 Input layer: keyboard + on-screen pad (pointer), single InputState consumed by sim; test-injectable

### S5 UI/UX (design pass first — docs/DESIGN.md before code)
- [x] S5.1 docs/DESIGN.md: screen map, HUD layout, dialogue box, menus, minimap spec, touch ergonomics, palette/typography
- [x] S5.2 HUD: HP/XP/quest log, redesigned per DESIGN.md; screenshot-validated
- [x] S5.3 Dialogue UI with portraits + choices (slot system end-to-end)
- [x] S5.4 Minimap: explored-tiles fog, player/objective pips, per-map
- [x] S5.5 Menus: title/class select, pause/resume, game over/retire, victory, mute; no CRT/emulator filter
- [x] S5.6 Playthrough test reaches victory on the original 2-map journey via button presses only

### S6 Depth & length (content expansion — world design doc first)
- [x] S6.1 docs/WORLD.md: region map — village (exteriors + house/shop/tavern interiors), forest, desert, castle exterior, castle interior + dungeon; portal graph; quest arc per region
- [x] S6.2 Interior map support: portals (door triggers), per-map ambience/bgm; village interiors built
- [x] S6.3 New exterior maps (village, deep forest, castle approach) with new tiles/props as content JSON
- [x] S6.4 Expanded questline: 6+ quests using multi-midpoint graphs (fetch, escort-lite, multi-counter, branch); new NPCs + dialogue banks
- [ ] S6.5 New enemy archetypes + yuka behaviors per region; difficulty curve in config
- [ ] S6.6 Playthrough test extended to full expanded journey, start → victory

### S7 Ship
- [ ] S7.1 Capacitor android scaffold; `pnpm cap:sync` green; mobile-first check (safe areas, touch)
- [ ] S7.2 CI (ci.yml: lint+typecheck+unit+browser headless-GPU+build; APK in ci.yml), release-please, dependabot, standard-repo docs (AGENTS.md, STANDARDS.md, CHANGELOG.md, TESTING.md, DEPLOYMENT.md, STATE.md)
- [ ] S7.3 Open PR, babysit to green, squash-merge; verify deployed/built app runs

## Learnings log (forward sweeps append here)
- yuka FleeBehavior defaults panicDistance=10 — silently inert beyond it; always set panicDistance explicitly when kiting.
- 2026-06-10: prior session's deep-research workflow + reviewer died on session exit — background work must be treated as lost across session boundaries; redo in-queue (S2.1).
- S2 learnings now binding: fixed camera yaw (Octopath constraint, verified); integer-scale + letterbox presentation for Android fractional DPR (2.625 Pixel-class); NearestFilter+no-mipmaps+SRGB on every texture; low-virtual-res render + integer upscale; HUD/UI is React DOM, never canvas. pixi.js evaluated and REMOVED — do not reintroduce.
- Sprite normal/height maps can be computed procedurally at atlas-bake time from pixel grids (research: external tools exist but we own the grids) — lighting polish option for S4.2.
- Prototype does not run (drawPixelSprite undefined, Y/O palette keys missing, orc quest unwinnable) — it is reference-only; fidelity means "values match", not "behavior matches bugs".
- 2026-06-10 S4/S5 vertical slice: browser playthrough is the authority for traversability. It exposed real content bugs: a one-tile bridge and one-tile dungeon doorways were not playable with the configured hitbox; use at least three tiles for bridge crossings and five tiles for dungeon doorway apertures.
- Mobile HUD constraint is now binding: default play view targets 80%+ gameplay area, with one-line top HUD, quest/minimap/audio in a right slideout, and translucent bottom controls. Capacitor device detection should replace breakpoint heuristics when S7 adds Capacitor.
- Wizard/controller usability: A-button auto-aim should reach the projectile's useful range; the full journey test depends on controls behaving like an arcade game, not mouse-precise aiming.
- CRT/scanline filters are explicitly out for this game: the visual target is FF7-era/HD-2D diorama staging, not an emulator overlay.
- 2026-06-11 S5.5 correction: UI must start from the Old Road Diorama design language (`docs/DESIGN-SYSTEM.md`, `src/config/ui.json`) before component styling. No `Press Start 2P`, no pure-yellow app chrome, no flat basic-material world staging, and AnimeJS owns authored menu motion.
- 2026-06-11 design correction: Errant Storybook supersedes Old Road Diorama naming. Use local IM Fell English SC, EB Garamond, and Alegreya Sans assets; no CDN fonts, no cyberpunk glass, no violet neon.
- 2026-06-11 persistence correction: `jeep-sqlite@2.8.0` requires matching `sql.js@1.11.0` web wasm. Browser tests with `MemorySaveRepository` are not enough; live headed web validation must include auto-save, reload, Continue enabled, and Continue returning to gameplay.
- 2026-06-11 Dependabot/save-stack correction: pinned Capacitor SQLite, Capacitor core/preferences, jeep-sqlite, and sql.js are ignored in `.github/dependabot.yml`; move them only as a single browser-validated compatibility set.
- 2026-06-11 S6.2 portal correction: named map spawns must land outside the trigger zone that would immediately reverse the transition; headed browser input caught the house entry auto-returning before the test could observe the interior.
- 2026-06-11 S6.3 depth correction: route length alone is not content depth. Exterior slices now need authored landmarks, NPC/object interactions, richer tile/prop vocabulary, and headed browser route validation through the player governor.
- 2026-06-11 shop interaction correction: shops cannot be chest rooms. The first keeper interaction is a stateful dialogue-driven travel-cake heal through quest effects; later economy work must stay content-driven, not hard-coded UI.
- 2026-06-11 S6.4 quest-depth correction: quest depth means authored midpoint graphs plus public-control browser proof for the NPC touchpoints. Morning errands, Oldwood oath, and Lost Page Rowan now exercise dialogue choices, counters, zone events, quest flags, and reachable NPC placement.
- 2026-06-11 browser-gate correction: a single aggregate browser invocation can hang after many headed specs. `pnpm test:browser` intentionally splits core browser specs from the long journey specs while still using the Vitest browser Playwright project and GPU-headed Chromium.
- 2026-06-11 visual screenshot correction: the castle approach tile first read like a modern lane-marked road and then like a black slab. Screenshot reading is mandatory because passing pixel/render tests do not prove the art direction is correct.
