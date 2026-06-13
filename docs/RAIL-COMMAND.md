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

## The dragon's kin — a boss per map (the Mario nod)

Roses are RARE by design: coin income grows roughly exponentially (a few,
then ~10, ~20, ~40-50, …) while bosses — and thus roses — are much
rarer. That scarcity is correct, but it exposes a late-game flaw: if
every rescue is the same dragon for one rose, the long run drags
(1-rose-1-dragon gets stale).

The fix is structural and funny: **each map has its OWN boss holding the
princess**, a full "sorry — our princess is in another castle" nod. Each
is a member of the dragon's KIN, with a tracked relation modifier — the
guardian you fell on map 1 turns out to be a brother, then an uncle, a
sister, a step-cousin, a great-aunt, and so on. A big assortment of kin +
modifiers (step-, great-, half-, twice-removed) gives every map a
distinct boss reward, a distinct color, and a running gag ("Oh — sorry,
I'm not the dragon with your princess. That's my brother/uncle/sister.").

Implementation: the kin are COLOR-RECOLORED from the green High Dragon
sheet (the same CC0-style derivation the Kenney dungeon tiles used — remap
the green ramp to a new hue per relative), so each map's dragon-relative
reads distinct without new art. The relation is config: a `dragonKin`
table mapping map → { relation, color, name } tracked in progress
(defeatedKin) so the dialogue can quip about who you've met.

**The map sub-tree structure (the DAG shape).** Unlocking a map is the
rose major; inside that map's sub-tree are TWO coin branches — the map's
own upgrades (economy/yield) AND a DRAGON sub-tree that starts with
unlocking THAT map's dragon (the kin boss) and continues with coin
upgrades for it (its phases, hp, reward). The shape per map node:

```
map-N  (rose major — "unlock this map")
 ├── map-N yield / economy ranks   (coins — the no-rose-wall sink)
 └── map-N dragon-unlock           (the kin boss appears as this map's holder)
      └── map-N dragon upgrades     (coins — phase/hp/reward ranks)
```

This obeys the same integrity rule the class DAG does (S19.1a gate): you
cannot reach a map's dragon upgrades before unlocking that map's dragon,
and you cannot reach the dragon before unlocking the map. So the player
flow is: unlock map (rose) → go in → unlock its dragon → upgrade the
dragon and the map (coins) → the dragon now holds the princess → fell it
for the rose → unlock the NEXT map. Each step keeps the rose boss fresh
and the coin sinks flowing.

**The principled rose-wall exception.** The no-rose-wall rule (every rose
node must offer a coin child) is NOT "no rose child ever" — it is "always
offer a coin sink too." The map sub-tree is the canonical healthy case: a
map node has BOTH a coin sub-path (its yield/economy ranks the player can
always farm toward) AND a rose-gated sub-path (the dragon unlock, which
itself pays MORE future roses). The player is never stuck — coins are
always spendable — and may OPTIONALLY invest roses in the map's dragon to
grow their future rose income. A node with one coin path and one rose path
is therefore correct by design; the gate permits it (it requires only a
coin child, not all-coin children).

**Dragon upgrades cost ROSES (the deliberate inversion).** The general
rule is "new things cost roses, upgrades cost coins." The dragon sub-tree
INVERTS the upgrade half on purpose: every dragon upgrade makes that map's
dragon stronger, and a stronger dragon — like a stronger antagonist —
pays MORE roses on the rescue. So a dragon upgrade is a rose investment
that returns rose dividends, and pricing it in roses is the logically
consistent choice (you spend roses to earn more roses, restrained so no
single upgrade breaks balance — the increment is small and the reward
scales with it). This is the one place upgrades-within-a-node are
rose-priced; it does not create a wall because the SIBLING map-economy
sub-path is always coin-priced and farmable. The map node thus offers
both: coins to grow your line and the map's yield, roses to grow the
dragon and your future rose income.

**Rose income is not all-or-nothing.** Because roses are rare, the economy
must have more sources than full rescues alone: a partial/failed run can
still pay SOME roses (advancing far enough up the rail, or unlocking a
map's dragon, yields fractional rose income). This smooths the scarcity —
a player who pushes deep but falls short still earns toward the next rose
gate, so progress never fully stalls on a single hard boss.

## The player's curve — why the DAGs are shaped this way

The intended experience, start to escalation:

The very first run is the same model as every run, just the shortest,
simplest map with NO enemies unlocked: the player throws out a knight, it
walks the rail, fights the dragon, frees the princess. *Easy!* That ease
is a gentle trap — it's what makes the upgrade screen land. The player
sees the DAG and realizes: if I unlock the earliest enemy (a peasant, a
bandit), each one I fell pays extra coins. Now I have a rose too — I could
unlock a ranger. But I smoked the dragon... another map? I'll save that.
Let me just unlock the bandit and farm more coins. Now ONE bandit starts
mid-map and marches the moment I place my knight — a little harder, the
knight's more battered, but I still smoked the dragon. I'll add the
ranged. Add another bandit. Oh — my ranger isn't as good here, it's
cramped, the bandits hit it too quick. That push-and-pull of opposing
elements is what makes the player look at the next map ("a bit bigger!")
and want it.

So the enemy DAG is a player-chosen difficulty dial that ALSO raises the
coin/rose income: each unlocked antagonist makes the current map harder
AND richer, and the friction it creates against the player's current
class tools is the pressure that sells the next class, the next rank, and
ultimately the next (bigger, crazier) map. Balance is making every step
of that push-pull feel earned — never a cliff, never trivial.

## DAG alignment theory (S19.1b lock — the three progressions move together)

This is an INCREMENTAL game, so the whole structure falls out of one rule:
**monotonic progression where every reachable state is solvable, and
difficulty rises smoothly.** The three DAGs — classes, enemies, maps —
advance in lockstep, ordered so that at EVERY node a player can field a
viable answer and the next node is a small step up, never a cliff. Every
specific rule below (offense-first, antagonist-vs-remediation, no
map-jumping) is just that one principle applied. The statistical harness
exists to PROVE it holds — no permutation of reachable unlocks produces a
spike, an outlier, or an unsolvable state.

**Class DAG — offense first, support last.** The unlock order is
melee → ranged → spells (the offensive core), THEN support (bards,
priests), THEN synergy and composites (the rose-priced endgame). A player
ALWAYS starts with — and can always drag onto the field — a minimum
offensive line, because that is what they begin with. By the time support
and composites are affordable they already have a solid core. Introducing
support before offense would be fatal: nobody wins a war with just a bard
and a priest. Mis-ordering a class node is a balance bug the harness must
catch (a support-heavy reachable state with no offensive answer is a
spike).

**Enemy DAG — antagonists vs remediation.** Enemies unlock in OPPOSITION
to the player's available counters: each new wave pattern is introduced
when (and only when) the player has unlocked the tools to remediate it.
Unlock an antagonist pattern before its remediation exists and the curve
spikes. The harness pairs each enemy-unlock state against the
contemporaneous class-unlock state and asserts the answer exists.

Each enemy type is itself a small sub-DAG: a SPAWN-PLACEMENT track. Per
enemy type the player can upgrade the number of potential spawn positions
(1 → up to 5), and each rank is a coin-reward multiplier — more spawn
points means more income but a harder line to hold, because the enemy can
now appear from any one of N positions, and different positions favor
different SLICES of the board (a left-lane spawn pressures the flank a
ranged unit wants; a mid spawn splits the line). This is the purest
expression of the antagonist dial: the player trades defensive certainty
for income, choosing how much chaos to invite. The placement set per
enemy is a scenario dimension the harness models alongside the
active-enemy-set — spawn geometry is a balance variable, not just a
spawn-count.

**Map DAG — successive, no jumping.** Maps are ordered DAG points: map 1
is upgraded/cleared before map 2, and so on — no map-jumping, the same
reason the class and enemy DAGs are strict. The princess always sits at
the LAST unlocked map; when the castle node unlocks, the castle moves to
the last map and the princess moves into the castle. Each map is meant to
be more fun and crazy than the last, which only works if the player
reaches it having earned the matching tools. (Tests may override the map
sequence to START at any map for isolated scenarios — see Testing shape —
but the SHIPPED progression is strictly successive.)

## Testing shape

PlayerGovernor becomes a CommanderGovernor: it perceives the public dataset
(front position, wave composition, toolbox counts) and acts by drag-placing
units (pointer events), never by buttons. Journeys assert the loop: place →
push → checkpoint coins bank → boss telegraphs → rescue or collapse →
DAG purchase → stronger next run.
