---
title: Project State
updated: 2026-06-13
status: current
domain: context
---

# Project State — shipped reality

A snapshot of what the game IS right now, for orientation. The full milestone
history lives in `docs/COMPLETED-MILESTONES.md`; the active queue in
`.agent-state/directive.md`; the design pillar in `docs/RAIL-COMMAND.md`.

## What it is

A rail-command incremental: a LINE of class units advances along a rail
(axis-agnostic, south→north or west→east), replenished from a finite toolbox,
against waves mustered from the map's gates, toward a princess held by a dragon.
A run always farms *something* (the always-advance floor); progression is the
upgrade DAG spent across three currencies (coins / gems / roses). Built in
TypeScript (Vite + Koota ECS + React/r3f renderer + yuka steering + howler
audio), shipped to Android via Capacitor.

## Content census (2026-06-13)

| | count |
|---|---|
| maps | 24 |
| enemy archetypes | 34 |
| upgrade-DAG nodes | 94 |
| sprites | 129 (86 .pix + 43 purchased-sheet) |
| props | 77 |
| difficulty regions | 8 (threat 2→9) |
| Dragon's Lairs | 6 (one per spine map) |
| classes | 12 (3 starting tiers → composites) |
| unit tests | 901 assertions; browser ~42 |

## The governing architecture: the ZONE MODEL

Maps declare **terrain features + spawn ZONES** (`waveGates`), NOT hardcoded
enemies. A map's wave enemies are `region.archetypes ∩ unlockedEnemies` — a
permutation of the player's unlocked enemy-DAG set — spawned at the gates. The
ONE authored exception per map is its boss/miniboss **climax**. So the same
room plays sparse on a bare unlock-set and dense on a full one; a map's
difficulty IS the player's enemy-unlock curve, experienced at their pace.

Every spine map has a hand-crafted **Dragon's Lair** (a multi-room dungeon, each
room a real zone-based rail with one authored bespoke miniboss climax). The
princess + the relocated dragon-kin boss sit in the deepest unlocked lair room.

## Key systems

- **Rail HUD** (line-command, not hero): a LINE-vitals aggregate, a WAVE chip,
  per-class unit chips with live hp, a rail-aware minimap front-marker.
- **Enemy DAG**: per-region archetypes individually unlockable; each unlock has
  a coin bounty connector (paid on every wave kill) and a spawn-PLACEMENT track
  (more ranks fan an enemy across more board-slice gates + multiply its bounty).
- **Three currencies**: coins (common, economy/ability), gems (dragon-hoard,
  maps/classes), roses (rare, the dragon track). The dragon track is rose-OR-gem
  priced — roses a logarithmic shortcut, gems the exponential fallback — so a
  player is never hard-stuck.
- **Combat feel**: 5 unit FX (deploy puff, charge dust, blade arc, heal glow,
  wither tint) + rail audio cues (deploy thunk, wave horn, per-verb attack
  voices, victory/collapse stingers).
- **Screens**: landing/results/gameover/upgrade as Errant Storybook parchment
  pages, READ at desktop + phone.
- **AUTO**: a headless `runRail` chains the spine toward the player's frontier.

## Verified

- All gates green: typecheck, biome lint, 901 unit tests (twice consecutively),
  ~42 browser tests (twice), build.
- The Android debug APK builds (`gradlew assembleDebug`) and BOOTS the rail game
  on a Pixel-class emulator — the HUD, world, toolbox, minimap render; touch
  works; save/Continue works (a native-only SQLite `values`-array bug was found
  and fixed on-device).
- Sim performance: a worst-case field (24 units + 40 enemies) steps ~0.69ms,
  far inside the 60fps frame budget.

## What's next

Release: `docs/STATE.md` and the doc set refreshed (this), then the PR / CI /
squash-merge, then live-verify (Pages plays a run, the release APK boots) before
the directive Status flips to RELEASED.
