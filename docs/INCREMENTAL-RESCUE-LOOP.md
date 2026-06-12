---
title: Incremental Rescue Loop
updated: 2026-06-11
status: current
domain: product
---

# Incremental Rescue Loop

The game is a mobile-first storybook incremental about repeating the old tale:
start at the south edge of the road, push north, defeat the dragon, rescue the
princess, spend the spoils, and return to a stranger version of the same tale.
The princess rescue is the loop. Villages, roads, interiors, props, NPCs, and
side encounters become unlockable route craft that changes the next run.

## Core Run

Each run is intentionally legible on a phone:

- The player starts at the bottom of a single rescue route.
- The princess waits at the top.
- A dragon guards the princess.
- The default route has no required castle interior navigation.
- The first playable class is the knight.
- The run result opens the upgrade web, then starts another rescue route.

The current expanded journey remains valuable source material. Hearthwake,
Oldwood, Sunken Road, Castle Approach, castle rooms, and dungeon pieces become
route packs, optional side loops, shortcut branches, and encounter modifiers
that can be unlocked into future rescue runs.

## Currencies

The loop uses two currencies with distinct emotional jobs:

| Currency | Source | Relative volume | Job |
| --- | --- | --- | --- |
| Coins | defeated enemies, road skirmishes, repeatable combat | common | buy breadth: route tools, enemy variety, class access, practical upgrades |
| Roses | princess rescue, clean objectives, road mastery, rare vows | rare | buy meaning: class-defining abilities, map changes, princess boons, large route mutations |

Roses come from the princess and from objectives that make the run feel like a
story, not from grinding ordinary enemies. Coin rewards should be frequent
enough to make a failed run useful; rose rewards should make a successful or
well-played run memorable.

### Death pays out

The player never has to finish. That is the point of the dual currencies: a
run that ends in death still banks every coin earned along the way — defeated
enemies, road tasks, miniboss clears, achievements, incremental objectives.
Roses require reaching the princess. Dying before the rescue means a run with
zero roses but real coin progress, so the next attempt always starts stronger.
Coins are the consolation arc; roses are the triumph arc. No outcome of a run
is ever a wipe.

## Upgrade Web

The upgrade screen is a spiderweb map rooted at one central vow. Nodes unlock
only through connected neighbors, so progression looks like a storybook tangle
rather than a vertical checklist.

Upgrade node categories:

- **Route:** bends, shortcuts, side loops, crossings, safe camps, interiors.
- **Enemy:** new enemy families, dragon phases, patrol density, elite variants.
- **Class:** ranger, rogue, bard, sorcerer, and later roles.
- **Ability:** class-defining moves and princess-granted powers.
- **Map:** route skins and rule changes such as market morning, thornwood
  dusk, flooded road, siege approach, or candlelit hall.
- **Relic:** account-wide conveniences that compress repeated play without
  skipping the rescue.

The web spends mostly coins near the root and asks for roses at branch-defining
moments. The class economy is fixed: **new character classes unlock with
roses**, and **every class owns its own coin-funded upgrade track** — its own
strand of the web growing out of the class node. Buying into a new identity is
a story moment paid with the rare currency; deepening an identity you already
own is steady coin work that every run funds, finished or not.

## Run Ladder and Minibosses

Every unlockable map area is a risk/reward decision made before the rescue:
new areas offer significantly better rewards at the cost of more route
complexity between the knight and the princess.

- **Every map has its own miniboss before the dragon.** Each route-pack map
  fields a named miniboss whose clear pays a significant coin purse and feeds
  rose objectives on clean clears. The dragon stays the final guardian; the
  minibosses are the rungs.
- Unlocking an area never makes an older area mandatory. Old ground stays as
  optional coin routes; new ground is where both danger and density rise.

## The Princess Is in Another Castle

Some upgrades move the tale itself. Unlockable maps come in both outdoor and
indoor flavors, and the deepest of them relocate the princess and the dragon:
unlock the castle and the rescue continues into the candlelit hall; unlock the
dragon lair and the top of the route moves again. The old summit becomes a
waypoint with its miniboss, and the ladder grows one honest rung — the
storybook homage is deliberate: the princess is in another castle.

## Balance Doctrine — No Sharp Edges

The loop must feel achievable, gradual, and organically balanced. Concrete
rules, enforced as budget tests over `src/config/incremental.json`:

- **Unlock cadence:** at any point in the web, the next affordable node should
  arrive within roughly one to three runs of ordinary play at the player's
  current depth. No node is priced like a wall.
- **Income scales with depth:** coin income at the player's deepest unlocked
  area outpaces earlier areas, so replaying old ground is a choice, never a
  tax. The player should never feel forced to partial-grind shallow routes to
  afford the next step.
- **Every run is forward progress:** death-banked coins guarantee even the
  worst run moves the web. Rose pacing rewards mastery without starving a
  player who dies often — coin-funded class tracks always offer a next buy.

## Content Positioning

Bespoke assets are no longer measured by campaign length alone. A village stall,
moving courier, tavern board, stable service, pilgrim kettle, or castle scribe
earns its place when it creates a route modifier, a reward node, a new objective,
or a different run texture.

Examples:

- Hearthwake props become the market-morning route pack and coin economy beats.
- Oldwood NPC loops become route objectives that award roses for safe passage.
- Sunken Road silhouettes become unlockable desert-route hazards and shortcuts.
- Castle interiors become optional rose-gated side loops instead of mandatory
  navigation before every princess rescue.
- Named road characters become recurring run modifiers with dialogue branches
  keyed by upgrade and rescue count.

## Mobile UX

The core run keeps the already-binding 80% gameplay-area rule:

- Currencies fit in the one-line top HUD.
- On phones, health remains a percentage and currency labels are compact.
- The upgrade web is a between-run screen, not persistent gameplay chrome.
- Quest log and minimap remain in the slideout unless the player opens them.
- Directional and A/B controls stay translucent overlays on the bottom corners.

## Validation Contract

The incremental pivot is accepted only when docs, tests, config, and runtime
agree:

- `src/config/incremental.json` owns currencies, run anchors, and upgrade nodes.
- Unit tests enforce the graph shape, currency rarity, class unlocks, and doc
  language.
- Browser tests validate any visible loop change through public A/B and
  directional controls.
- The results panel and upgrade web must be reachable by A/B and directional
  input only; pointer buttons are mirrors, not a separate path.
- The playthrough governor eventually plays a full rescue run, spends rewards
  on the upgrade web, starts a second run, and observes the unlocked change.

## Current Implementation Status

- S9.1 is complete: this pillar doc and `src/config/incremental.json` define
  currencies, class unlocks, route packs, and the connected upgrade web.
- S9.2 is complete: Drizzle/Capacitor SQLite saves persist coins, roses, rescue
  count, unlocked classes, unlocked route packs, purchased nodes, and the last
  run summary through `snapshotJson`.
- S9.3 is complete: princess rescue opens results, A opens the upgrade web,
  up/down moves selection, A buys an affordable connected node, and B returns
  to results through public controls.
- S9.4 remains the next runtime-shape change: build the compact bottom-to-top
  rescue route with knight start, princess top anchor, dragon guard, compact
  currency HUD, and browser playthrough coverage.
- S9.5 remains the second-run proof: rescue, spend, start another run, and
  observe the unlocked route/class/enemy/map mutation through player-facing
  state.
- The reward-loop mandate (2026-06-11) adds the queue beyond S9.5: realign the
  class economy (rose-priced class unlocks, per-class coin tracks) before the
  runtime slice, then death-payout coin banking, per-map minibosses, princess
  relocation unlocks, and budget tests enforcing the no-sharp-edges doctrine.
