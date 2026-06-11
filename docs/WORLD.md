---
title: World Plan
updated: 2026-06-11
status: current
domain: design
---

# World Plan

The expanded journey is a storybook road that starts in a village, crosses
forest and desert thresholds, reaches a castle approach, descends into interior
castle spaces, and ends in the dungeon already proven by the vertical slice.
Every new region is content-first: maps live in `src/content/world/maps`,
dialogue and quests live in `src/content/story`, and code only interprets the
content contract.

## Region Map

| Region | Map ids | Role | Tone |
| --- | --- | --- | --- |
| Hearthwake Village | `map:village`, `map:village-house`, `map:village-shop`, `map:village-tavern`, `map:village-stable` | opening hub, tutorial NPCs, save/load mental model, optional lived-in micro-spaces | warm vellum, chimney smoke, gentle tune |
| Oldwood Forest | `map:oldwood-forest`, `map:deep-forest` | first combat and branching errand chain | green canopy, rustling percussion, cautious patrols |
| Sunken Road Desert | `map:sunken-road`, `map:desert-ruins` | key hunt, ranged enemies, environmental gates | ochre, low strings, mirage shimmer |
| Castle Approach | `map:castle-approach`, `map:castle-yard` | escalation, guarded gate, exterior siege props | dusk brass, drums, tighter paths |
| Castle Interior | `map:castle-hall`, `map:castle-library`, `map:castle-armory` | exploration, dialogue reveals, heraldic room verbs | candlelit stone, echoing arpeggios |
| Dungeon | `map:castle-dungeon` | final combat, rescue, victory | cold stone, low drones, boss pressure |

## Portal Graph

Portal triggers are map triggers with `kind: "portal"`. They must carry:

- `toMap`: destination map id.
- `toSpawn`: named spawn id in the destination map.
- `label`: player-facing door/road name for debugging and tests.
- `requiresFlag`, when the doorway is story-locked.
- `sfx`, normally `interact` unless a region owns a stronger cue.

Destination maps expose `spawns`, a dictionary of named positions. `default`
always exists and equals `playerSpawn`; every portal destination must resolve
to a named spawn. This allows two-way interior doors without hard-coded
coordinates in app code.

```mermaid
flowchart LR
  Village["map:village"]
  House["map:village-house"]
  Shop["map:village-shop"]
  Tavern["map:village-tavern"]
  Stable["map:village-stable"]
  Forest["map:oldwood-forest"]
  DeepForest["map:deep-forest"]
  Desert["map:sunken-road"]
  Ruins["map:desert-ruins"]
  Approach["map:castle-approach"]
  Yard["map:castle-yard"]
  Hall["map:castle-hall"]
  Library["map:castle-library"]
  Armory["map:castle-armory"]
  Dungeon["map:castle-dungeon"]

  Village <--> House
  Village <--> Shop
  Village <--> Tavern
  Village <--> Stable
  Village <--> Forest
  Forest <--> DeepForest
  DeepForest <--> Desert
  Desert <--> Ruins
  Desert <--> Approach
  Approach <--> Yard
  Yard <--> Hall
  Hall <--> Library
  Hall <--> Armory
  Hall --> Dungeon
```

## Quest Arc

The expanded route keeps the existing rescue as the ending but gives it a full
storybook middle.

| Act | Quest | Required map coverage | Shape |
| --- | --- | --- | --- |
| 1 | `quest:morning-errands` | village, house, shop, tavern | talk/fetch loop that teaches interiors and Continue |
| 1 | `quest:broken-bridge` | village, oldwood forest | existing bridge quest moved into the village-to-forest road |
| 2 | `quest:oldwood-oath` | oldwood forest, deep forest | multi-counter combat and NPC report chain |
| 2 | `quest:lost-page` | tavern, deep forest, library clue | branch between ranger trail and wizard clue |
| 3 | `quest:dungeon-key` | sunken road, desert ruins | existing key hunt expanded with a ruin interior |
| 3 | `quest:castle-letters` | castle approach, yard, hall, library, armory | guarded-gate dialogue and heraldic evidence collection |
| 4 | `quest:rescue-amber` | castle hall, armory/library, dungeon | final rescue and victory |

The playthrough test grows with each act. It must use only player controls:
keyboard A/B and directional input or the virtual pad/buttons.

## Hearthwake Shop Economy

Keeper Brindle's shop is an NPC counter, not a chest room. Its first sample
cake remains a one-time story kindness, but the post-sample interaction opens a
content-authored counter:

- Shop files live in `src/content/shops/*.json` and own the keeper, display
  name, listings, buy prices, sell prices, and transaction SFX.
- Listings point at `item:*` ids. Items remain the semantic inventory entries;
  the shop only prices and presents them.
- The player owns an inventory trait and gold trait. A buys the selected
  listing, B sells one owned copy of the selected listing, and up/down changes
  selection. React displays the counter; the sim owns all gold/inventory
  mutation.
- The shop room must include authored shelf/counter props and at least one
  additional talkable villager so the interior reads as a lived place rather
  than a colored box.
- Browser validation must enter the shop through public controls, speak with
  Brindle, open the counter, buy, sell, and observe gold/inventory changes.

## Map Contracts

- Exterior maps are larger than interiors and may include enemy spawn tables.
- Interior maps are compact, readable, and have no persistent HUD panels other
  than the top line; doors must not hide behind the on-screen controls.
- Door apertures must be at least five tile rows/cols when the player hitbox
  needs to pass through a wall-like boundary.
- Every map has a `bgmTheme`; the village slice uses authored `village` and
  `interior` ToneJS themes from `src/config/audio.json`.
- Every map has `spawns.default`; portal destinations use named spawns.
- Every portal is reversible unless explicitly gated by story flags.
- Every story gate has both collision behavior and a visible indicator.
- The minimap covers the current map only; changing maps resets exploration
  display to that map's own explored set.

## Authored Pixel Diorama Vocabulary

The 2.5D forced-perspective style does not require imported 3D assets before
the world can feel richer. The first expansion pass should author more native
pixel content and let the r3f diorama pipeline project it into depth:

- **Buildings:** cottage, shop, tavern, chapel/gatehouse, stable, castle
  outbuildings. Each should have a map footprint, facade prop, roof color,
  doorway portal, and minimap silhouette.
- **Trees and roadside props:** broadleaf trees, stump, signpost, fence,
  well, cart, barrels, crates, beds, tables, shelves, hearths, lanterns, and
  banners. These should be content JSON props with reusable draw ops, not
  hard-coded JSX or one-off CSS.
- **NPC silhouettes:** villagers, keeper, page, guard, hermit, desert pilgrim,
  castle scribe. Palette swaps are acceptable when the silhouette still reads
  as a different role.
- **Forced-perspective polish:** exterior facades sit as upright billboards
  with foot anchors; roofs/upper floors can be shorter stacked billboards with
  slight depth offsets. Interior furniture remains flatter and denser so phone
  screens stay readable.
- **Asset library use:** commercial/local asset packs are reference material
  and optional source material. They should not block authored 16-bit content
  that fits this game's language more directly.

## First S6 Slice

The first implemented depth slice is village interiors:

1. Add portal-capable schema/types/runtime.
2. Add `map:village`, `map:village-house`, `map:village-shop`, and
   `map:village-tavern`.
3. Add browser tests that enter a village interior and return through the same
   visible controls.
4. Keep the existing original journey playable while the expanded route grows.
5. Drive the interior journey with the player governor from
   `docs/PLAYER-GOVERNOR.md`, not with private sim writes or coordinate
   teleports.

## Second S6 Slice

The next implemented depth slice is exterior road length:

1. Add `map:oldwood-forest`, `map:deep-forest`, and
   `map:castle-approach` as authored exterior maps.
2. Connect village east road to Oldwood, Oldwood to Deep Forest, and Deep
   Forest to Castle Approach with reversible `kind: "portal"` road-edge
   triggers.
3. Add at least one forest ground tile, one castle-road tile, and new
   storytelling props for signs, stumps, and castle approach staging.
4. Preserve the original proven victory path until the expanded questline
   replaces it in S6.6.
5. Add a focused browser route test that uses the player governor and public
   directional input to travel from Hearthwake Village to Castle Approach.

## Third S6 Slice

The quest-depth slice turns the expanded route into a playable errand chain
with named people and midpoint objectives:

1. Add `quest:morning-errands`, a village fetch loop that starts only when the
   player enters Hearthwake Village, sends the player from Page Pip to Keeper
   Brindle, and resolves back at the village green without polluting the
   original overworld playthrough log.
2. Add `quest:oldwood-oath`, a multi-counter Oldwood quest that starts on
   `map:oldwood-forest`, introduces the Oldwood Hermit, counts forest raiders,
   and finishes only after the player carries the oath toward the deeper road.
3. Add `quest:lost-page`, an escort-lite Deep Forest quest where Lost Page
   Rowan is guided by player movement through a landmark zone and then back
   toward the west road.
4. Add `char:page`, `char:hermit`, and `char:lost-page` with dialogue banks
   that resolve through the normal state-conditioned slot system.
5. Validate the slice through both reducer tests and headed browser tests that
   use the player governor's real A-button and directional controls.

## Fourth S6 Slice

The enemy-depth slice makes each region play differently without breaking the
storybook road readability on phone screens:

1. Add a JSON difficulty curve in `src/config/enemies.json` that orders
   region pressure from Oldwood patrols through castle sentries and the final
   dungeon. The curve owns region ids, map ids, tier, threat score, and the
   enemy archetypes expected on each map.
2. Oldwood Forest uses readable patrol pressure: `oldwood-raider` guards
   clearings with normal patrol aggro while `thorn-shaman` adds slow ranged
   denial near the edges of the road.
3. Deep Forest introduces ambush behavior: `bramble-stalker` waits until the
   player enters its trigger range, then uses Yuka seek steering as a sudden
   close-range chase. This makes the deeper woods feel different from the
   opening forest without filling the direct route with unavoidable damage.
4. Castle Approach introduces guarded-leash behavior: `gate-sentry` and
   `banner-knight` commit near their posts, then return to the gate instead of
   chasing across the whole map. This keeps the approach tense while preserving
   the player-governed route test.
5. Dungeon enemies remain relentless and boss-led. Their curve entry must be
   stronger than the approach entry and must keep the existing proven victory
   encounter intact until S6.6 expands the end-to-end journey through the new
   route.

Enemy AI remains config-first. Code may add general Yuka behavior interpreters
such as `ambush` and `guard`, but individual placement, palette, hitbox, speed,
range, cooldown, and projectile data live in JSON.

## Fifth S6 Slice

The expanded playthrough slice replaces the original two-map proof with a
single start-to-victory journey through the authored road:

1. New Game starts in `map:village`, not the legacy `map:overworld`.
2. The required route is Hearthwake Village, Oldwood Forest, Deep Forest,
   Sunken Road, Castle Approach, and Obsidian Throne Dungeon.
3. `quest:oldwood-oath` starts the key hunt after the player carries the oath
   beneath the east bough; the legacy bridge quest remains playable in
   `map:overworld` but no longer gates the main expanded route.
4. `map:sunken-road` owns the Sandwyrm key fight around a broken caravan wash:
   shallow water, broken stone footings, sandstone ruin teeth, and wrecked cart
   props make it a story landmark rather than another straight corridor.
   Deep Forest routes into Sunken Road, and Sunken Road routes into Castle
   Approach.
5. Castle Approach owns the key-gated castle entry portal. `quest:dungeon-key`
   can complete from the Castle Approach gate as well as the legacy overworld
   gate, then the route must pass through the castle yard and hall before the
   dungeon.
6. `tests/browser/playthrough.test.tsx` must prove the full route through real
   keyboard A/B and directional input only, including the final victory screen.

## Sixth S6 Slice

The castle-interior slice turns the key gate into a short authored dungeon
approach instead of a single teleport from road to final room:

1. Add `map:castle-yard`, `map:castle-hall`, `map:castle-library`, and
   `map:castle-armory` with reversible portals, named spawns, and no hidden
   spawn-inside-door loops.
2. Change `map:castle-approach` so the key-gated `trigger:castle-gate-entry`
   leads to `map:castle-yard`; `map:castle-hall` then owns the final portal
   into `map:castle-dungeon`.
3. Add a castle scribe NPC and `quest:castle-letters`: the player speaks with
   the scribe, visits the library archive, visits the armory standard, returns
   to the scribe, and receives the visible all-clear before entering the
   dungeon.
4. Add authored castle props for banners, shelves, lanterns, weapon racks, and
   throne doors. These must use outlined pixel grids with at least five visible
   channels; flat rectangles do not count.
5. Expand the headed browser playthrough so the main journey reaches the
   dungeon only after entering the yard, hall, library, and armory through
   real directional input and A-button dialogue.
6. Read fresh screenshots for the castle approach/hall route before accepting
   the slice, because the 2.5D camera can magnify large wall props into unreadable
   slabs.

## Seventh S6 Slice

The desert-ruins slice turns the Sunken Road landmark into an explorable
interior instead of a background suggestion:

1. Add `map:desert-ruins` as a reversible interior off `map:sunken-road` with
   a named `from-ruins` return spawn that lands outside the entry trigger.
2. Use authored ruin-floor, mural, shrine, and arch content so the room reads
   as old road history rather than another rectangular box.
3. Add a desert pilgrim NPC and mural trigger. The player can enter the ruin,
   walk to the mural, receive a short lore dialogue, and return to Sunken Road
   through public directional input and A-button dialogue.
4. Keep the main victory route direct: the Sunken Road east-road trigger still
   reaches Castle Approach, and the ruins are a readable landmark loop rather
   than a required detour for the current key quest.
5. Capture fresh desktop and phone screenshots of the ruin interior before
   accepting the slice.

## Eighth Content-Depth Slice

Hearthwake Village is the player's first proof that the game is an adventure,
not a corridor. The market-day slice thickens the starting village before the
road pulls east:

1. Add a small market cluster to `map:village` using authored stall, board, and
   flower-cart props placed around the well and road.
2. Add named townsfolk with dialogue banks so the village has more voices than
   the required quest NPCs.
3. Keep the east-road route readable and passable for the player governor.
4. Add a headed browser test that starts from a save, walks to a market
   townsperson through public controls, presses A, and reads the dialogue.
5. Capture desktop and phone screenshots of the market cluster before accepting
   the slice, with mobile still preserving the gameplay-area budget.

## Ninth Content-Depth Slice

Market density should not stop at static props. The first-town NPC motion slice
adds authored walking loops without changing the player's public controls:

1. Extend map entity content with optional NPC patrol points and a speed.
2. Interpret those patrol points through a Yuka-backed NPC steering system,
   feeding the same `MoveIntent`/movement pipeline as enemies and the player.
3. Give Tobin Bell a short market-board loop while leaving Mara Cress stationary
   for the A-button dialogue browser route.
4. Unit-test deterministic NPC patrol movement and keep the headed market
   browser test green.

## Tenth Content-Depth Slice

Hearthwake still needs ordinary life around the road so the first screen reads
as a storybook place, not a junction with buildings. The livelihood slice adds
small domestic set dressing and another town voice:

1. Add authored village props for a vine trellis, bakery oven, laundry line, and
   seed crates. These must use outlined pixel grids with several channels so
   they read as objects, not flat color signs.
2. Place the props around the existing house, shop, tavern, and market roads
   without blocking the east-road playthrough route or the market dialogue test.
3. Add a named Hearthwake NPC whose dialogue points at the new village details
   and reinforces the old-fashioned errand tone.
4. Add unit coverage that proves the doc, prop ids, character, dialogue bank,
   and village placements all exist as content.
5. Add headed browser validation that walks to the new townsperson through
   public controls, presses A, and captures a screenshot of the denser village.

## Eleventh Content-Depth Slice

The first exterior road must feel like Oldwood, not a straight hallway with a
forest texture. The road-shape polish slice adds landmark clusters around the
existing route while preserving the proven public-control traversal:

1. Add authored forest props for a mossy waystone, fallen log, bramble hedge,
   and lantern post. Each prop needs outlined pixel detail and at least five
   recolor channels.
2. Place the landmarks around `map:oldwood-forest` and `map:deep-forest` so
   the player sees bends, clearings, and roadside history before combat starts.
3. Keep the direct route passable for the player governor and the full
   start-to-victory playthrough.
4. Add unit coverage for the doc, prop ids, and map placements.
5. Add headed browser validation that enters Oldwood through public controls,
   walks to the first landmark cluster, and captures desktop and phone evidence.

## Twelfth Content-Depth Slice

The player governor needs to plan against authored affordances, not only
coordinates. The tavern-governor slice makes `map:village-tavern` a social
interior with enough visible state for a goal/action loop to choose route and
interaction acts:

1. Add an Unfurled Vine tavern cluster with benches, hearth-song detail, and a
   story-quilt prop so the room reads as a gathering place instead of a dark
   rectangle with tables.
2. Add a named tavern NPC whose dialogue points at the room details and gives a
   storybook reason for the road to begin in public life.
3. Expand the test-side player governor with a small planner over public
   perception and content-authored action descriptors: enter a map, walk to an
   affordance point, press A, and verify visible dialogue.
4. Add unit coverage for the new planner contract plus tavern content ids,
   placements, character, and dialogue.
5. Add headed browser validation that starts from a real save, lets the
   governor plan into the tavern through public controls, talks to the tavern
   NPC, and captures desktop plus phone evidence.

## Thirteenth Content-Depth Slice

The tavern should become playable story, not just scenery. The notice-board
questlet slice turns the hearth-song board into a readable prop and uses the
quest graph to send the player back to Merrin:

1. Extend prop interaction content so a prop can request a dialogue bank/slot
   through the same dialogue outbox used by NPCs and quest effects.
2. Make `prop:hearth-song-board` readable with A, emitting a dialogue event
   from a dedicated board voice.
3. Add `quest:tavern-song` as a short start-on-enter quest: read the board,
   ask Merrin what the verse means, then set a completion flag.
4. Add Merrin dialogue slots for the questlet stage and after-state so the
   tavern reacts to the board being read.
5. Add planner-driven browser validation that enters the tavern, reads the
   board, talks to Merrin, and verifies the quest log changes through public UI.

## Fourteenth Content-Depth Slice

Readable props should not stay confined to interiors. The main road needs
landmarks the player can inspect while traveling, with quest-log consequences
that prove the detail is playable:

1. Make the Oldwood mossy waystone readable with A and a dedicated voice bank.
   The `quest:oldwood-waystone` log starts on Oldwood entry and completes when
   the marker is read.
2. Make the Sunken Road broken cart readable with A and a dedicated voice bank.
   The `quest:sunken-cart-ledger` log starts on Sunken Road entry and completes
   when a cart is read.
3. Keep both interactions content-authored through prop `interaction.dialogue`;
   no bespoke React UI or private sim calls.
4. Add unit coverage for docs, prop metadata, dialogue banks, quests, flags,
   and quest runtime progression.
5. Add headed browser validation that uses the player governor to enter or
   resume each route, walk to the readable prop, press A, assert visible
   dialogue/log changes, and capture desktop plus phone evidence.

## Fifteenth Content-Depth Slice

Readable clues should change later play. The first consequence pass makes the
Oldwood waystone matter when the player reaches the Hermit:

1. Add a flag-gated Hermit dialogue branch for
   `flag:oldwood-waystone-read` while `quest:oldwood-oath` is still at
   `find-hermit`.
2. Keep the same accepted choice event (`dlg:hermit.oath:accepted`) so the
   quest graph remains data-driven and the full route still advances.
3. Update the full public-control playthrough to read the waystone, then prove
   the Hermit reacts to that prior inspection.

## Sixteenth Content-Depth Slice

Readable objects should answer the player's button press with more than text.
The affordance pass turns inspection into a visible and audible action:

1. Extend prop `interaction` content with `feedback.anim`, an `anim:*`
   reference consumed by the renderer when the prop is inspected.
2. Add a short manuscript-style inspection pulse animation for readable props;
   it should read as storybook emphasis, not neon UI or CRT effects.
3. Keep the existing content-authored SFX path for readable props and verify
   that A-button inspection increments the ToneJS SFX debug counter.
4. Prove the pulse through browser tests driven by the player governor: walk to
   route readables, press A, assert the prop reports a fresh feedback pulse, and
   capture desktop/phone evidence from the headed browser.
5. Fold the feedback check into the full public-control playthrough at the
   waystone read so the start-to-finish journey validates inspection as a game
   action, not only dialogue.

## Seventeenth Content-Depth Slice

Hearthwake must feel like a village that existed before the player arrived. The
stable-yard slice adds an optional working space beside the main route so the
opening hub has more than cross paths, quest boxes, and static facades:

1. Add `map:village-stable` as a compact reversible interior off
   `map:village`, with an entry spawn and a `from-stable` village return spawn
   outside the outbound trigger.
2. Add a Hearthwake Stable facade plus authored tack, hay, oat-bin, and stall
   props. Each prop must use outlined pixel grids with at least five visible
   channels so the scene reads as old-fashioned craft rather than flat color.
3. Add a named stablehand NPC with dialogue about saddle-bells, oats, and the
   eastern road. The stable must have a social verb, not just scenery.
4. Keep the player governor's direct village-to-Oldwood route passable while
   adding the stable as a short optional detour to the full public-control
   playthrough.
5. Add headed browser validation that enters the stable through real movement
   controls, presses A near the stablehand, verifies visible dialogue, and
   captures desktop plus phone evidence with the phone HUD still leaving most of
   the viewport to gameplay.

## Content Depth Bar

The first playable world cannot remain a five-minute corridor. Each new map
slice must add at least one meaningful player-facing verb or story signal:

- Shops are NPC interactions first, not treasure boxes. The first keeper
  interaction gives a one-time travel-cake heal through the quest/effect
  pipeline, then the shop opens a content-driven buy/sell counter with player
  inventory and visible gold changes.
- Exterior maps should read as places: signage, stumps, trees, gatehouses,
  barrels, and NPCs placed around roads, not only long cross-shaped paths.
- Optional interiors off the main road need a clear reason to exist: a landmark
  prop, a talkable person or readable object, and a reversible exit.
- Road maps may keep a direct route for the player governor, but the tile plan
  should imply bends, clearings, landmarks, and branches that can hold future
  quests.
- Every route expansion should add browser validation through real movement
  and A/B input before claiming depth.
