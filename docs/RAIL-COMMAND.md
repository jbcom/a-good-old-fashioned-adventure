---
title: Rail Command Pivot
updated: 2026-06-12
status: current
domain: product
---

# Rail Command — the incremental finds its tension

User mandate (2026-06-12, verbatim intent): free movement is not conducive to
strategy in an incremental — the tension is all off. No class selection.
New Game / Continue only. The run starts with the top HUD and a new bottom
HUD toolbox with a panel for each unlocked class; upgrades unlock MULTIPLES
of each class. Each class has its own autonomous behavior (Yuka). Enemies
come as waves of unlocked enemies starting 1v1, with variety and count
scaling through the adversarial upgrades. Every map carries a DESIGNED route
of travel — effectively a rail. Place a knight (or any unit) by dragging
from the toolbox to anywhere on the currently visible bottom of the route
and it advances immediately. The view advances toward the map's end — the
next map, the princess and dragon, or the castle entrance. This removes the
A and B buttons and the directional pad entirely.

## What the player does

1. **New Game / Continue.** No class picker. The roster IS the unlocked
   classes and their unlocked counts from the upgrade DAG.
2. **Place units.** Drag a class panel from the bottom toolbox onto the
   visible lower stretch of the rail. The unit deploys and advances on its
   own. Place up to everything the DAG has unlocked.
3. **Watch the push.** Units fight by class temperament; waves spawn ahead;
   the camera follows the front line up the rail.
4. **Bank the outcome.** The wave line collapsing = death pays out (coins
   kept, roadTravelled per rail checkpoint the front crossed). Reaching the
   princess past the dragon = roses. Between runs: the emblem DAG.

## Class temperaments (Yuka behaviors, config-driven)

| Class | Movement | Attack |
| --- | --- | --- |
| Knight | CHARGES the nearest enemy from wherever placed, fast engage | melee arc, hit-stop crunch |
| Ranger | slow advance, holds range | single-target arrows; spread/multi-shot via DAG ranks |
| Sorcerer | slow advance | AoE bursts (emberweave widens) |
| Rogue | fast flanker, slips past the front | burst melee on casters/back line |
| Bard | mid-line | marching-meter auras (speed/heal pulses) via DAG |

Each temperament is an archetype block in `classes.json` (movement profile +
attack profile), interpreted by a unit-AI system that reuses the enemy
Yuka interpreter patterns (seek/flee/charge/hold-range are shared verbs).

**The Yuka player-governor work transfers directly (user call-out).** The
governor already solved "an autonomous agent that perceives the field,
picks a target, navigates to it, and engages through the same inputs the
sim honors" — that is exactly what an allied unit is. The plan-and-pursue
loop in `tests/harness/playerGovernorModel.ts` (perceive → choose action →
reach point → engage) moves INTO the sim as the unit brain: each placed
unit runs a per-class instance of it on Yuka steering, while the test-side
governor shrinks to a CommanderGovernor that only places units and reads
the public dataset. One brain, two homes — the in-sim version drives play,
the test version drives strategy.

## Class tiers (S18 lock — user mandate: string the characters DAG from simple to medium to advanced)

The characters track becomes a three-tier ladder. Every class is a bespoke
pixel design with its own emblem, temperament, and DAG node.

**Simple tier (run-one identities).** Knight (sword-and-shield: charge),
ranger (hold-range single-target arrows), rogue (flank), bard (marching
auras), wizard (hold-range bolts), sorcerer (slow AoE). Already shipped.

**Medium tier (earned complements, ~3-4 roses each, gated on a simple
parent).** Priest after bard — `heal-beam`: holds mid-line and channels
focused healing into the most wounded ally (stronger than the bard's pulse,
single-target). Warlock after sorcerer — `debuff-aura`: slow advance,
projects a withering field that slows enemies and lowers their damage
inside its radius. Barbarian after knight — `blade-storm`: the knight
stays sword-and-shield; the barbarian charges past the front and spins,
striking every enemy in its whirl radius each beat.

**Advanced composites (the long roses grind, ~8-10 roses, gated on BOTH
parents).** Dread Knight = knight + warlock: a charge that carries the
withering field with it — every blow also debuffs. Shaman = priest +
sorcerer: AoE blasts that heal allies standing inside the burst. Stormcaller
= wizard + barbarian (my composite): a blade-storm of bolts — spins while
loosing projectiles at every enemy in range. Composites are the final
unlocks the player works hard to reach; their emblems should read visibly
"fused" (two parent motifs in one glyph).

## Waves

The enemy side mirrors the unit side: waves spawn from authored gates ahead
of the front, drawn from the map's unlocked archetypes. Wave 1 of map 1 is a
single trash mob walking down the rail the moment the first unit lands.
Adversarial DAG ranks (orc-warband etc.) raise wave size/variety — the
existing bounty economy plugs in unchanged: harder waves, richer waves.

## The rail

Maps already author a road; the rail formalizes it: an ordered polyline of
the existing road-waypoint zones (S15.1) becomes the route spine. Units and
waves path along it (Yuka follow-path with per-class lateral freedom —
knights may leave the rail to charge, rogues flank wide). The camera tracks
the FRONT (furthest allied unit), so the view advances exactly as the user
described. Rail checkpoints keep paying `roadTravelled` when the front
crosses them.

## What survives unchanged

Dual currency and death-pays-out; the emblem DAG screen (it is the between-
wave shop); warband/adversarial economy; bosses, choreography, telegraphs,
minibosses and first-clear roses; the `.pix` pipeline and all authored art;
map content (gains rail + gate metadata); persistence; deterministic sim
and evidence-driven journeys.

## What is removed

The class picker (title becomes New Game / Continue), the virtual pad, the
A/B gameplay buttons, free player movement, the player entity as a single
controlled hero (units are spawned allies; there is no `IsPlayer` pawn in
the field — command state replaces it).

## Sim model (S17.1 lock)

- **Roster.** `rosterFor(progress)` derives `{ classId, count }[]` from the
  DAG: a class node unlocks the class at count 1; `unitCount` rank nodes
  (the class-track coin connectors gain `effect: { unitCount: 1 }` per
  rank) raise the multiple. The knight starts at 1. The toolbox shows one
  panel per rostered class with `remaining = count - placed`.
- **Unit trait.** `IsUnit({ classId, brain })` + the existing Transform /
  Health / Speed / MoveIntent / Facing / CombatTimers vocabulary. There is
  no `IsPlayer` pawn in the field; HUD vitals aggregate the front line.
  Units are spawned ONLY by `spawnUnit(world, classId, x, y)` (factory
  doctrine).
- **Temperaments.** `classes.json` gains per-class `temperament`:
  `{ verb: "charge" | "hold-range" | "aoe" | "flank" | "aura", engage:
  number, ...verb tunables }`. One interpreter system (`unitAI`) drives all
  units on Yuka steering, sharing seek/flee verbs with `enemyAI`; the
  governor's plan-and-pursue model is its decision layer (perceive field →
  pick target by temperament → pursue → engage through the same combat
  paths enemies use).
- **Rail.** `getRail(mapId)` orders the map's `road-waypoint` zones south →
  north by zone center; units and waves receive Yuka follow-path along it
  with per-class lateral freedom (knight breaks rail to charge; rogue takes
  a wide offset lane). Placement is legal within the visible band south of
  the front.
- **Waves.** Maps gain `waveGates: { id, x, y }[]` and the sim a
  `WaveState` world resource `{ wave, nextAt, alive }`. Wave N draws from
  the map's region archetypes: size = `1 + floor(N/2) + warband ranks`,
  variety widens with N. A gate releases its wave when the front crosses
  its trigger line or the previous wave dies. Wave kills pay the standard
  bounty economy.
- **Front + camera.** `Frontline` world resource = max rail-progress over
  living units. The camera eases toward the front (existing camera-follow
  swaps its target). Checkpoint crossings by the FRONT pay roadTravelled.
- **Win / collapse.** Reaching the rail's end engages the map's placed boss
  (dragon choreography unchanged); boss death → princess → roses. All
  units dead with a wave still alive = collapse → `recordDeathPayout` —
  identical ledger semantics to today.
- **Controls.** Gameplay input is exactly one gesture: drag a toolbox panel
  onto the rail band (pointerdown on panel → pointermove → pointerup on
  stage = `spawnUnit`). Menus are tap-only. The keyboard keeps ONLY menu
  navigation; A/B/d-pad and the virtual pad are deleted in the same commit
  that turns the new journey green.

## Migration (every commit stays green)

1. Unit sim lands BESIDE the player sim (units + waves fully unit-tested
   while the old journey still passes).
2. The toolbox + drag placement land behind the existing playing mode;
   the new CommanderGovernor journey is written against them.
3. The cutover commit: title becomes New Game / Continue, the player pawn
   stops spawning, pad/A/B/picker code and their tests are deleted, the
   old button journeys are replaced by the commander journeys — one commit,
   all gates green before and after.

## Endgame (S19.1 lock)

Boss engagement needs no new mechanism: enemyAI already targets the
nearest allied unit when no pawn exists, and boss choreography aggros on
that same distance — the front walking into the boss's range IS the
engagement. The rescue re-keys off the front: when the line is engaged,
no pawn exists, the map's choreographed boss is dead, and the front
stands within `incremental.loop.rescueRadius` of Princess Amber, the sim
reduces the `dlg:princess-amber.freed:seen` quest event directly — the
quest engine advances unchanged (rose, victory, results into the DAG
shop), exactly as if a pawn had spoken to her. The princess stays an
authored NPC; nothing about her content changes.

## Testing shape

PlayerGovernor becomes a CommanderGovernor: it perceives the public dataset
(front position, wave composition, toolbox counts) and acts by drag-placing
units (pointer events), never by buttons. Journeys assert the loop: place →
push → checkpoint coins bank → boss telegraphs → rescue or collapse →
DAG purchase → stronger next run.
