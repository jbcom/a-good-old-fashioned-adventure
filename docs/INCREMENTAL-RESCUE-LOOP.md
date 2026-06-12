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
moments. A class unlock can cost coins; an identity-changing class ability
should usually ask for roses.

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
