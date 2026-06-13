# Continuous Work Directive — a-good-old-fashioned-adventure

**Status:** ACTIVE
**Owner:** Claude (mandated by jbogaty)
**Mandate (current):** Rail-command incremental (docs/RAIL-COMMAND.md) built to full polish on the long-running local branch, fully autonomously, docs → tests → code, headed GPU browser journeys driven by the CommanderGovernor through public state, every visual READ before commit, until ALL features are fully implemented and polished. Founding mandate + full history: docs/COMPLETED-MILESTONES.md.

**Branch:** `feat/incremental-arc` — ALL work layers here as forward commits; remote/CI is touched ONCE at the arc's end (S23). No per-item PRs or pushes. Local review trio at every milestone boundary, findings folded forward.

## What CONTINUOUS means
1. Never stop for status reports the user didn't ask for.
2. Never stop for scope caution.
3. Never stop to summarize — git log is the summary.
4. Never stop for context pressure — the directive + pillar docs carry full state.
5. Never stop because a task feels big — pick the next atomic commit.
6. Only stop on: explicit user halt, red CI blocking, or genuine STOP_FAIL.

## Operating loop
while queue has [ ] items: docs → failing test → implement → verify (screenshots READ for visuals) → commit LOCALLY → mark [x] → backward/forward sweep → refine THIS FILE → next.
Milestone boundary: local review trio on the milestone diff; fold every finding forward; move the closed milestone's [x] block to docs/COMPLETED-MILESTONES.md.
Arc end (S23): push once, ONE PR, babysit to squash-merge, live-verify Pages + APK.

## Standing constraints
- Libraries: react, koota, animejs, tone, yuka, ajv; r3f renderer; pnpm; biome; vitest (unit node + browser headed GPU; journeys serialized).
- Sim purity: src/sim/** pure TS, seeded RNG facade, no Math.random/performance.now (gates.json enforces).
- All numbers from src/config, all content from src/content. Factories own spawning. Both .pix parsers move together.
- Gameplay control surface is EXACTLY one gesture: toolbox drag placement. Menus are tap + keyboard parity.
- Every runRewards key must have a grant path; every upgrade node an emblem; every class a temperament (gates enforce).

## Forbidden phrases
"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
"pause point" | "natural pause" | "fresh session" | "next session" | "stopping point" | "clean handoff" | "ready to hand off"

## Checkbox discipline (anti-stop hook contract)
Items are ONLY `- [ ]` (open) or `- [x]` (done) — never ad-hoc states like `[~in progress]`, which the stop hook cannot count. Partial progress is recorded in the item's text, the item stays `[ ]`. External waits use `- [ ] [WAIT] ...` or `- [ ] [WAIT-REVIEW] ...` prefixes (the hook recognizes these as legitimate yields). Every turn must advance HEAD, change this file, or change the open count.

## Binding learnings (full log: docs/COMPLETED-MILESTONES.md)
- Instrument the public dataset FIRST when anything flakes — never patch tolerances around an undiagnosed cause; counters (data-*-calls) crack what hypothesis-cycling cannot.
- Synthetic pointers have no capture: guard releasePointerCapture in try/catch everywhere.
- Run-close paths zero live ledgers when writing lastRun; ALL run ends (death, victory, retire, collapse) go through the same payout.
- Archetype flags (knockbackImmune, touchHarmless) must be honored on EVERY damage/displacement path.
- Untrusted save numerics: floor AND cap; seeded saves must honor production invariants (purchased+ranks together).
- Never run two browser suites concurrently; never pipe test output through tail/grep without asserting summary lines; vitest has no "line" reporter.
- Hand-maintained test file lists rot — directory sweeps with explicit exclusions, gated.
- Configured-but-unconsumed config is the recurring rot (orc-warband, roadTravelled, vigor maxHp): every promise needs a consumption gate.
- One commit per issue; fixes forward, never amend reviewed commits; evidence pngs ride their feature commit.
- The .pix validator passes undeclared lowercase channel chars silently — eyeball every new grid in the regenerated sheet.

## Queue — to fully implemented and polished

### S-ART Thorough pixel-art audit (user mandate 2026-06-12: review ALL pixel art for clarity and polish and enough detailed features, and ensure enough breadth for a deep and broad game)
- [x] SA.1 Audit pass: regenerate and READ every sheet (terrain, props, route-props, characters, bosses, effects, upgrades) at zoom; per-asset verdict (clear / weak / unreadable) recorded in docs/PIXEL-ART-AUDIT.md with the named weaknesses (silhouette, contrast, detail density, palette discipline)
- [x] SA.2 Polish pass (first sweep): rework every weak grid (more outline discipline, interior detail, broken edges, highlights) — sheets regenerated and re-READ until every asset is clear at game scale
- [x] SA.0 Purchased asset library (user mandate 2026-06-12: ~/src/arcade-cabinet/voxel-realms has the working pattern — scripts/fetch-itch-audio.mjs + ITCH_API_KEY in .env; my itch library holds a LOT of purchased sprite sheets AND audio packs that would REALLY uplevel the game if organized and researched under public/assets/): (a) copy the key into this repo's gitignored .env and adapt the fetcher (owned-keys exploratory pass → classify packs: 16-bit-compatible sprite sheets, tilesets, SFX, music); (b) curate an allow-list that fits Errant Storybook (no style clashes), download + extract to raw-assets/ (gitignored), then ORGANIZE the keepers under public/assets/ with a manifest (pack, license, files, mapped use) and an integrity gate; (c) research pass recorded in docs/PIXEL-ART-AUDIT.md: which packs supply SA.3's region breadth (enemy bodies, props, tiles) and which audio packs replace/augment the ToneJS synth recipes in S20.3 (SUPERSEDED 2026-06-12 by user mandate: "we can fully switch from tonejs and procedural to howlerjs you have TONS of wav mp3 and ogg now" — the audio engine REPLACES ToneJS with howler.js playing the purchased library outright: themes from the staged m4a surfaces, every sfx recipe mapped to a purchased sample, combat sfx coverage from the owned Impact & Hit / Fantasy Magic / Explosion packs via the fetcher allow-list, ToneJS dependency removed) — purchased breadth where it fits, bespoke .pix where identity demands it
- [ ] SA.5 FULL CAST CONVERSION (user mandate 2026-06-12, verbatim: "does this give you enough material to cover every character with proper sprites? if not then refactor all the character classes to fit the new sprites you do have. now that we have tons of proper background foreground and npcs and characters and enemies we should phase out as much procedural as possible" / "even if it means changing characters to match sprites and doing some creative writing" / "for example if you dont have a bard get creative about different kinds of mages" / "i want you explore ALL the possibilities"): purchased sheets become the PRIMARY art source for the entire cast; bespoke .pix survives only where no sheet fits and identity demands it. (a) COMPLETE material inventory — every character sheet in every pack read at zoom (14 citizens, 3 guards, 6+ warriors, 3 mages, rogues, heavy knight, Kenney roguelike characters sheet) with per-sheet verdicts and state lists recorded in docs/PIXEL-ART-AUDIT.md; (b) cast assignment matrix — every char:* (34), every player class, every archetype, every NPC mapped to a purchased sheet OR a justified bespoke survivor, gaps resolved by CREATIVE REWRITES (class identities may change: knight→sword-and-shield fighter, ranger→archer, wizard→one of three mage bodies; missing classes reinvented from available bodies, e.g. no bard → a different mage flavor with rewritten flavor text); (c) class + character refactor executing the matrix (classes.json, characters.json, dialogue surface where names/descriptions shift, princess + cast portraits); (d) procedural phase-out — terrain/prop drawOps and weak .pix grids retired in favor of Kenney dungeon/interior/city slices and Electric Lemon material wherever style passes; (e) narrative alignment pass (story text, quest copy, bestiary strings match the new bodies). OPERATING RULES (user guidance 2026-06-12 verbatim: "you do NOT need to strictly go 1:1 what i am giving you are prompts but YOU should use as much of extracted as possible REALLY build a rich world and THOROUGHLY confirm placements and alignments and bindings ensuring maps look visually stunning"): the matrix is a prompt, not a contract — maximize material usage (variant bodies per region, ambient citizens in every map, dressed corners everywhere), and EVERY placement/binding gets visual confirmation (stage screenshot read at zoom, alignment checked against neighbors, anchor/groundline verified) before its commit — visually stunning maps are the acceptance bar. ENEMY PADDING (user idea 2026-06-12: "we have tons of citizens guards etc we could probably grab some for unlockable bandits and other enemies to unlock in random encounters for different behavior types, pad out our enemies"): the 14 citizen combat sheets + guards + warriors seed an outlaw tier — unlockable bandit variants with distinct behavior types (ambusher, skirmisher, poacher, deserter guard) appearing through random encounters; design the unlock/encounter surface when wiring step 2 (guards + bandit rewrite)
- [ ] SA.3 Breadth gap analysis: count tiles/props/enemy designs/boss designs/fx per region against the route maps the loop ships; author the missing content (each region needs its own visual vocabulary — no region may read as a palette swap of another); census + uniqueness gates updated. SA.0 supplies (public/assets/MANIFEST.json): Elthen trash bodies under enemies/ (need a PNG-sheet atlas source path + sprite defs + frame-row pinning), High Dragon under bosses/dragon/ (replaces boss-scale sprite:dragon, 4-dir 96px strips), Backterria roguelike mega-sheet (needs the slicer manifest before cells are addressable props/items) — author bespoke .pix only for what the packs do not cover. Second import wave on disk (raw-assets/extracted/, inventory in docs/PIXEL-ART-AUDIT.md): humanoid packs (citizens-guards-warriors, warriors_rogues_mages, heavy-knight — hooded mage + heavy knight auditioned CLEAR; need directionRows resolver support) cover the shaman/raider/orc/sentry/citizen gap; Kenney Roguelike Dungeon + Interior tilesheets attack the worst tile counts (dungeon 3 families, interior 6); Roguelike City (1040 tiles) feeds village props; Explosion Pack feeds S20.2 wave fx; Rune Pack feeds spell/emblem fx; Foliage/Brick/RPG-Tiles-Vector/RTS-Medieval need a scale audition before use
- [ ] SA.4 Aseprite deep-dive (user question 2026-06-12: are we exploring EVERYTHING aseprite offers? — honest answer: NO, the pipeline is one-way .pix→export and uses none of the animation tooling). Explore and adopt what earns its place: (a) multi-frame animation authoring through the aseprite MCP (add_frames, duplicate_frame_range, tween_cel_positions_eased, oscillate_cel_positions, set_tag per anim, frame durations) to build richer walk/attack/cast cycles than hand-typed .pix frames, exported back as frame strips; (b) audit_animation + animation_sanitize as QA gates over every animated sprite; (c) the preview server for live iteration while authoring; (d) palette tooling (set_palette, remap_colors_in_cel_range) to derive per-region palette families systematically; (e) a documented round-trip story (.aseprite edits flowing back to .pix or replacing it as source where animation demands it); record what was adopted vs rejected and why in docs/PIXEL-ART-AUDIT.md
- [ ] SA.R Review trio; archive

### S19 The run completes in rail mode (the loop must close: rescue, results, next run)
- [ ] S19.1 Endgame: the front reaching the rail's end engages the placed boss (choreography unchanged); boss death frees the princess — rescue pays roses and opens results→upgrade-DAG WITHOUT a pawn (the dialogue/results path re-keys off the front); commander journey wins a full run
- [ ] S19.2 Map transitions: clearing a map's boss advances the run to the next route map (route packs / castle relocation honored); per-map rails + wave gates authored for every route map in the loop; map-evidence uniqueness gates green
- [ ] S19.3 Orphaned content decision executed: NPCs/dialogue/shops/interiors lost reachability in the pivot — implement their rail-mode role (waystation camps where the front pauses: keeper heals, shop spends coins, story beats fire) OR formally retire them with content and suites adjusted; no dead content ships
- [ ] S19.R Review trio; archive

### S20 Polish (user standing mandate: finished, not POC)
- [ ] S20.1 Rail HUD: front-line vitals aggregate, wave counter, per-class unit chips with live hp, minimap shows rail + front; Errant Storybook chrome; phone-first; evidence read
- [ ] S20.2 Combat feel for units: deploy puff, charge dust, blade-storm arc fx, heal-beam glow, withered tint — AnimeJS/FxBurst driven, READ in frame bursts
- [ ] S20.3 Audio: deploy thunk, wave horn, per-verb attack voices, victory/collapse stingers from audio.json recipes; browser-asserted through the HUD audio state
- [ ] S20.4 Screen polish: landing/results/gameover/upgrade to final Errant Storybook quality, all READ at both viewports
- [ ] S20.R Review trio; archive

### S21 Balance and telemetry
- [ ] S21.1 Run-length telemetry (absorbs S15.3): journeys record wall-time + sim-clock per run to evidence; sane upper band asserted; baseline noted
- [ ] S21.2 Economy re-tune for rail income: wave bounty curves, per-map checkpoint totals, tier prices vs measured runs-to-afford; no-sharp-edges gates over the full DAG incl. composites
- [ ] S21.3 Difficulty arc: per-map wave tables ramping variety/threat across the route; adversarial ranks integrated per region; paper-playtest numbers recorded
- [ ] S21.R Review trio (absorbs S15.R residue); archive

### S22 Platform validation
- [ ] S22.1 Android: cap:sync green, APK boots the rail game on a Pixel-class profile, touch drag verified, safe areas honored; screenshots read
- [ ] S22.2 Performance: 60fps phone budget with a full field (max roster + wave 10), draw audit, heap stability over three runs
- [ ] S22.R Review trio; archive

### S23 Arc close-out (the ONE remote touch)
- [ ] S23.1 Full gates: unit + browser twice consecutively, content census, evidence sweep, docs refreshed to shipped reality (README, ARCHITECTURE, DESIGN, RAIL-COMMAND, WORLD, TESTING)
- [ ] S23.2 Push the arc, open ONE PR, babysit (flake-retry, thread resolution) to squash-merge
- [ ] S23.3 Live-verify: Pages plays a full rail run (screenshot read), release APK boots; THEN Status flips to RELEASED
