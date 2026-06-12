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

## Testing shape

PlayerGovernor becomes a CommanderGovernor: it perceives the public dataset
(front position, wave composition, toolbox counts) and acts by drag-placing
units (pointer events), never by buttons. Journeys assert the loop: place →
push → checkpoint coins bank → boss telegraphs → rescue or collapse →
DAG purchase → stronger next run.
