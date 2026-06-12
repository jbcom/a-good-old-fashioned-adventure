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
- The run result opens the upgrade graph, then starts another rescue route.

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

There is exactly ONE coin wallet: `IncrementalProgress.coins`. Chest gold,
enemy bounties, and shop transactions all read and write it directly — there
is no separate per-run purse. Treasure banks the moment it is opened (so a
death after a good haul still pays, per the death-pays-out rule), and a shop
purchase mid-run spends real savings, which is the intended risk/reward
choice. The pre-pivot `PlayerGold` trait was a second wallet whose contents
evaporated at run end; it is removed, not bridged.

### Death pays out

The player never has to finish. That is the point of the dual currencies: a
run that ends in death still banks every coin earned along the way — defeated
enemies, road tasks, miniboss clears, achievements, incremental objectives.
Roses require reaching the princess. Dying before the rescue means a run with
zero roses but real coin progress, so the next attempt always starts stronger.
Coins are the consolation arc; roses are the triumph arc. No outcome of a run
is ever a wipe.

## Upgrade DAG

The upgrade graph is a proper directed acyclic graph rooted at one central
vow (decision 2026-06-11: DAG over the earlier spiderweb metaphor). Edges are
directed — each node lists the prerequisite nodes that must already be owned,
and a node becomes purchasable only when **all** of its prerequisites are
purchased. The graph has exactly one source (the root vow), no cycles
(validated by a topological-sort unit test), and its `unlocks` lists are the
exact reverse edges of `prerequisites`. The between-run screen presents nodes
by topological tier, so progression reads as honest forward steps rather than
a tangle.

Upgrade node categories:

- **Route:** bends, shortcuts, side loops, crossings, safe camps, interiors.
- **Enemy:** new enemy families, dragon phases, patrol density, elite variants.
- **Class:** ranger, rogue, bard, sorcerer, and later roles.
- **Ability:** class-defining moves and princess-granted powers.
- **Map:** route skins and rule changes such as market morning, thornwood
  dusk, flooded road, siege approach, or candlelit hall.
- **Relic:** account-wide conveniences that compress repeated play without
  skipping the rescue.

### Roses open nodes; coins fill the edges

The currency split maps onto the graph structure itself (user decision
2026-06-11):

- **Rose nodes are the majors** — the special branching-off points of the DAG.
  A new character class, a new map or route pack, a new boss or enemy family,
  a princess relocation: each is a rose-priced node that opens a whole new
  branch. Rose nodes are deliberately sparse; buying one is a story moment.
- **Coin steps are the connectors** — the incremental, multi-rank upgrades
  clustered between and around the majors. A coin upgrade is not one purchase
  but a ranked track (`1/3`, `2/5`, ...): extra health, more enemies handled
  at once, damage, run conveniences. Each rank costs coins and the cost grows
  per rank, so every run's banked coins always have somewhere meaningful to
  go.
- **Natural progression flows** fall out of the pairing: each rose major
  unlocks its own cluster of coin-ranked upgrades that deepen what the major
  introduced — unlock the ranger with roses, then rank up the ranger's craft
  with coins; unlock a new map with roses, then rank up your readiness for its
  miniboss with coins. Topping out a coin cluster is the signpost that the
  next rose major is near.

The class economy follows directly: **new character classes unlock with
roses**, and **every class (knight included) owns its own coin-funded ranked
track** — its own branch of the DAG growing out of the class node. Buying
into a new identity is a story moment paid with the rare currency; deepening
an identity you already own is steady coin work that every run funds,
finished or not.

### Five tracks in a ring

The DAG organizes into five named tracks arranged in a ring around the root
vow (user brainstorm 2026-06-11, structured by the agent). Each track is a
sub-graph with one entry node; three entries start owned, one is the root
itself, and one is locked:

| Track | Entry node | Starts | Contents |
| --- | --- | --- | --- |
| Characters | the Knight | owned | rose majors unlock classes; coin ranks deepen each class |
| Encounters | first trash family | owned | adversarial coin ranks (counts, density); rose majors add families and boss phases |
| Roads | first outdoor route | owned | outdoor map majors branching map to map, each with its miniboss |
| Castle | castle gate | **locked, rose major** | indoor room-graph placed on the deepest unlocked outdoor map as the final destination; richest rewards; princess/dragon relocation lives here |
| Vows | the First Vow (root) | owned | relics, princess boons, achievement-fed conveniences |

Branching out keeps working the same inside every track — map nodes connect
onward to more map nodes, room nodes to more rooms. The castle track is the
late-game spine: once unlocked, its room graph grows into the big final
castle whose benefits outweigh any outdoor route, and each deeper castle
unlock can move the princess and dragon further in.

### Adversarial incrementals

Some coin ranks are a positive for the enemy and against the player — and the
player buys them anyway, because the risk pays. Ranking up an enemy family's
count (one more orc on the route maps per rank) makes every run harder, but
every extra orc is more coins per run. Adversarial ranks are the loop's
self-balancing throttle: the player chooses when to raise the danger in
exchange for income, instead of the game imposing a difficulty curve.

Mechanically: an upgrade node with `enemyFamily` and owned `ranks` adds one
reinforcement per rank when a map instantiates. Enemy archetypes carry a
`family` tag in `enemies.json`; reinforcements spawn at deterministic offsets
beside that family's authored spawns on the map (collision-probed so they
land on walkable ground), so the same save always produces the same field.
Each reinforcement carries the node's `spawnBounty` — paid in coins on top of
the standard `enemyDefeated` reward when it falls. The bounty is what makes
the adversarial trade rational: harder roads, but every extra orc pays.

### Bosses are placed; trash is fodder

Enemy content splits into two deliberately different species:

- **Bosses and minibosses are bespoke.** Each has its own hand-authored pixel
  art design in the native `.pix` sheets and a specific, authored placement on
  its map — the sandwyrm at the wash, the gatehouse knight, the dragon at the
  summit. Rose majors are what touch bosses: a new boss, a new boss phase, a
  relocated guardian.
- **Trash mobs are the coin engine.** Random encounters and map-fill fodder
  earn coins and behave like roguelike modifiers — their count, density, and
  variety are governed by coin-ranked (often adversarial) upgrades, not by
  authored placement. Trash exists to make travel pay; bosses exist to make
  arrival matter.

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

## Agent Design Contributions (2026-06-11)

Gaps identified by paper-playtesting the loop, owned by the agent rather than
waiting for the user to call them out:

- **Death is a story beat, not a game over.** The knight is carried back to
  Hearthwake; the results panel narrates the death payout in storybook voice
  ("The road kept your coins safe: 36 banked"). The death screen must read as
  a chapter ending, never a punishment, or the death-pays-out economy stays
  emotionally invisible.
- **Run length budget.** A baseline rescue run fits a phone session: two to
  five minutes bottom-to-top, growing only modestly with unlocked depth. Route
  length is a designed budget, not an accident of map count.
- **Deterministic rose pity.** The first clean clear of each miniboss always
  pays a rose; repeat clears pay coins. Rose pacing must never starve a player
  through bad luck — predictable mastery payouts replace RNG.
- **Next-vow signpost.** The results panel names the cheapest affordable next
  node ("Next vow: Knight's Vigor — 10C") so the DAG teaches itself and every
  run ends pointing somewhere.
- **Currencies must feel different.** ToneJS gives each currency its own
  motif (coin chime, rose bloom phrase) and the HUD counter pulses via AnimeJS
  when a reward banks — especially on death, where the payout is the
  consolation.

## Mobile UX

The core run keeps the already-binding 80% gameplay-area rule:

- Currencies fit in the one-line top HUD.
- On phones, health remains a percentage and currency labels are compact.
- The upgrade graph is a between-run screen, not persistent gameplay chrome.
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
- The results panel and upgrade graph must be reachable by A/B and directional
  input only; pointer buttons are mirrors, not a separate path.
- The playthrough governor eventually plays a full rescue run, spends rewards
  on the upgrade graph, starts a second run, and observes the unlocked change.

## Current Implementation Status

- S9.1 is complete: this pillar doc and `src/config/incremental.json` define
  currencies, class unlocks, route packs, and the connected upgrade graph.
- S9.2 is complete: Drizzle/Capacitor SQLite saves persist coins, roses, rescue
  count, unlocked classes, unlocked route packs, purchased nodes, and the last
  run summary through `snapshotJson`.
- S9.3 is complete: princess rescue opens results, A opens the upgrade graph,
  up/down moves selection, A buys an affordable connected node, and B returns
  to results through public controls.
- S9.4 is complete: `incremental.loop.startMap` boots a new game into
  `map:rescue-route` — knight south, serpentine coin-fight climb, the winnable
  `dragon-guardian` below the princess plateau, `quest:rescue-run` paying the
  rescue roses into results, with the one-line currency HUD and a public-input
  browser run proving the whole loop. The expanded road stays playable as the
  route-pack library behind saved slots.
- S9.5 remains the second-run proof: rescue, spend, start another run, and
  observe the unlocked route/class/enemy/map mutation through player-facing
  state.
- The reward-loop mandate (2026-06-11) adds the queue beyond S9.5: realign the
  class economy (rose-priced class unlocks, per-class coin tracks) before the
  runtime slice, then death-payout coin banking, per-map minibosses, princess
  relocation unlocks, and budget tests enforcing the no-sharp-edges doctrine.
