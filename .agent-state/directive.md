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
- [ ] S2.1 Research 2.5D extrapolation of 16-bit pixel art (FF7-era: pre-rendered perspective, billboards, y-sort scaling, parallax, Mode-7 planes; modern: depth maps, normal maps for pixel art); web-renderer options; write docs/RESEARCH-2.5D.md with cited findings I verified
- [ ] S2.2 Build BOTH spikes: pixi 2D (y-sort + parallax + scale-by-depth "2.5D-lite") and r3f true-3D-billboard spike, render real content (hero sprite + tiles), screenshot each, READ screenshots, judge quality
- [ ] S2.3 Record decision + why in docs/ARCHITECTURE.md; delete losing spike; wire winner as src/render foundation

### S3 Core runtime
- [ ] S3.1 Content loader: glob-import + ajv at boot + typed registries (tiles/props/sprites/palettes/anims/maps/chars/items/flags/quests/dlgbanks)
- [ ] S3.2 Koota world + traits from content `koota.traits` vocab; factories own ALL spawning; map instantiation (generation ops → grid, spawn tables → entities)
- [ ] S3.3 Sim systems: clock, seeded RNG, movement+tile collision, camera follow/shake; unit tests
- [ ] S3.4 Event bus (enemy:defeated, item:acquired, dlg:*, zone:entered); quest engine as reducer over events; dialogue slot resolver; unit tests for full quest chain logic
- [ ] S3.5 Combat: melee swing, projectiles, damage/knockback/iframes, drops; unit tests
- [ ] S3.6 Yuka enemy behaviors: replace prototype AI states with yuka steering/FSM (patrol, chase/seek, flee-kite for shaman, boss charge+spread); validate behavior in browser test

### S4 Presentation
- [ ] S4.1 Sprite atlas baker: (grid × palette) → offscreen canvas; palette swap correctness test (pixel-compare screenshots)
- [ ] S4.2 Renderer: tile layers, y-sorted entities, draw-ops, water/anim layers; screenshot vs prototype reference
- [ ] S4.3 AnimeJS bindings: walk-bob, hit-flash, pickup-bob, trail-fade driven from anim:* content; visible in browser test
- [ ] S4.4 ToneJS audio engine: synth SFX from audio.json recipes + BGM sequencer (themes, per-map switch); browser test asserts Tone graph nodes
- [ ] S4.5 Input layer: keyboard + on-screen pad (pointer), single InputState consumed by sim; test-injectable

### S5 UI/UX (design pass first — docs/DESIGN.md before code)
- [ ] S5.1 docs/DESIGN.md: screen map, HUD layout, dialogue box, menus, minimap spec, touch ergonomics, palette/typography
- [ ] S5.2 HUD: HP/XP/quest log, redesigned per DESIGN.md; screenshot-validated
- [ ] S5.3 Dialogue UI with portraits + choices (slot system end-to-end)
- [ ] S5.4 Minimap: explored-tiles fog, player/NPC/objective pips, per-map
- [ ] S5.5 Menus: title/class select, pause, game over, victory; CRT toggle, mute
- [ ] S5.6 Playthrough test reaches victory on the original 2-map journey via button presses only

### S6 Depth & length (content expansion — world design doc first)
- [ ] S6.1 docs/WORLD.md: region map — village (exteriors + house/shop/tavern interiors), forest, desert, castle exterior, castle interior + dungeon; portal graph; quest arc per region
- [ ] S6.2 Interior map support: portals (door triggers), per-map ambience/bgm; village interiors built
- [ ] S6.3 New exterior maps (village, deep forest, castle approach) with new tiles/props as content JSON
- [ ] S6.4 Expanded questline: 6+ quests using multi-midpoint graphs (fetch, escort-lite, multi-counter, branch); new NPCs + dialogue banks
- [ ] S6.5 New enemy archetypes + yuka behaviors per region; difficulty curve in config
- [ ] S6.6 Playthrough test extended to full expanded journey, start → victory

### S7 Ship
- [ ] S7.1 Capacitor android scaffold; `pnpm cap:sync` green; mobile-first check (safe areas, touch)
- [ ] S7.2 CI (ci.yml: lint+typecheck+unit+browser headless-GPU+build; APK in ci.yml), release-please, dependabot, standard-repo docs (AGENTS.md, STANDARDS.md, CHANGELOG.md, TESTING.md, DEPLOYMENT.md, STATE.md)
- [ ] S7.3 Open PR, babysit to green, squash-merge; verify deployed/built app runs

## Learnings log (forward sweeps append here)
- 2026-06-10: prior session's deep-research workflow + reviewer died on session exit — background work must be treated as lost across session boundaries; redo in-queue (S2.1).
- Prototype does not run (drawPixelSprite undefined, Y/O palette keys missing, orc quest unwinnable) — it is reference-only; fidelity means "values match", not "behavior matches bugs".
