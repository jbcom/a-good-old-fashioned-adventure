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

### S18 Class roster tiers (user mandate: simple → medium → advanced composites)
- [x] S18.1 Tier design doc (docs/RAIL-COMMAND.md §class tiers)
- [x] S18.2 Bespoke pixel art: six advanced designs + six fused emblems, sheets read
- [ ] S18.3 Sim + DAG (user mandate 2026-06-12: UNIQUE GOAP behaviors tied to EACH class so every unlock is a rewarding upgrade — yuka Think/GoalEvaluator brains, not parameter-swapped verbs; each class makes visibly different DECISIONS): per-class goal evaluators — knight guards the front and bodies the biggest threat; ranger prioritizes the target the front is fighting; rogue HUNTS the back line (casters/turrets behind tanks); bard keeps the median of the line in aura; priest moves toward the MOST WOUNDED ally, ignoring enemies; warlock positions to cover the MOST enemies with the withered field; barbarian dives the densest cluster; sorcerer leads volleys at the largest pack; composites blend BOTH parents' evaluators (dread-knight charge+wither, shaman burst+mend, stormcaller whirl+volley); unit tests assert DISTINCT choices in identical fields. Plus the original scope: new temperament verbs (heal-beam channels the most wounded ally; debuff-aura Withered field slowing/weakening enemies, honored on every damage path; blade-storm whirl hitting all in radius; composites: dread-knight charge applying Withered on hit, shaman AoE healing allies inside the burst, stormcaller spin loosing bolts at all in range); classes.json entries with temperaments; six DAG nodes (priest-vows/warlock-pact/barbarian-storm gated on their parents at 3-4 roses; dread-knight/shaman/stormcaller gated on BOTH parents at 8-10 roses); unitCount rank connectors per new class; deterministic duels per verb; balance gates green at the new depths
- [ ] S18.4 Journey: seeded roster with medium+advanced units placed and fighting (verbs visible through dataset assertions); toolbox shows the tier ladder; phone + desktop evidence read
- [ ] S18.R Review trio on the S18 diff; findings folded; milestone block archived

### S-ART Thorough pixel-art audit (user mandate 2026-06-12: review ALL pixel art for clarity and polish and enough detailed features, and ensure enough breadth for a deep and broad game)
- [ ] SA.1 Audit pass: regenerate and READ every sheet (terrain, props, route-props, characters, bosses, effects, upgrades) at zoom; per-asset verdict (clear / weak / unreadable) recorded in docs/PIXEL-ART-AUDIT.md with the named weaknesses (silhouette, contrast, detail density, palette discipline)
- [ ] SA.2 Polish pass: rework every weak grid (more outline discipline, interior detail, broken edges, highlights) — sheets regenerated and re-READ until every asset is clear at game scale
- [ ] SA.3 Breadth gap analysis: count tiles/props/enemy designs/boss designs/fx per region against the route maps the loop ships; author the missing content (each region needs its own visual vocabulary — no region may read as a palette swap of another); census + uniqueness gates updated
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
