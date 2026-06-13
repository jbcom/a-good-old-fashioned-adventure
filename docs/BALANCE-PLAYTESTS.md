---
title: Balance Paper-Playtests
updated: 2026-06-12
status: current
domain: quality
---

# Balance Paper-Playtests (S19.1a)

Paper playtests are the PRIMARY design instrument (user mandate): before
any programmatic tuning, walk every DAG as distinct player personas,
beginning to end, against the LIVE config, and record where it feels
trivial, where it feels like a cliff, and what the persona wants next.
The intended experience is docs/RAIL-COMMAND.md §The player's curve.

These are real research, not a parroted form: findings below drive
concrete design changes (new DAG nodes, re-orderings, balance deltas),
proposed here and tracked into the directive.

## The config under test (2026-06-12 snapshot)

**Starting state:** `first-vow` (free root) unlocks knight-vigor (10c×5),
oldwood-bend (1R), ranger-trail (1R), dragon-wake (2R), battle-tempo (1R).
Only the knight is a fielded class at the root; ranger needs ranger-trail
(1R), and **the wizard has no unlock node at all** despite being a coded
playable class with a temperament (finding F1).

**First-tier roles:** knight (charge, hp80, melee), ranger (hold-range,
hp55), wizard (hold-range, hp50) — the offensive core. Support arrives
deeper: bard (aura+heal) via thornwood-mastered→bard-road-song (~5R),
priest (heal-beam) via bard-road-song→priest-vows or sorcerer-cinder→
priest-vows.

**Enemy curve:** oldwood/rescue-route → forest-orc(20hp), oldwood-raider
(24), thorn-shaman(28 caster). deep-forest adds orc-scout(15 fast),
bramble-stalker(34 ambush). Then desert/castle escalate. Bosses:
dragon-guardian(60hp choreo) is the rescue-route guardian; shadow-warlord
(160) the dungeon final.

## Personas

### P1 — The Rusher (unlocks enemies fast for coin velocity)

Run 1: knight only, no enemies unlocked beyond the map's authored cast.
Throws the knight, it walks the rail, fights the dragon-guardian (60hp),
frees the princess. *Easy.* Banks ~47c (harness-measured), 1 rose from
the rescue. **Feel: the gentle trap is working — trivially winnable, but
the upgrade screen now beckons.**

Run 2: the rusher's instinct is "each enemy I unlock pays more coins."
FINDING F2: today there is no per-enemy unlock node — `orc-warband`
(25c×3, behind dragon-wake at 2R) only scales wave SIZE, and the map's
archetypes are all active from the start. The rusher CAN'T express "unlock
the bandit for coins" yet. The S21.4 enemy-DAG (per-enemy unlock +
placement) is the missing mechanic the rusher persona most wants. Until
it exists, the rusher's only difficulty dial is orc-warband ranks — a
blunt size knob, not the rich per-enemy choice the design promises.

Cliff risk: orc-warband at 25c (first rank) is reachable in ~1 run, but it
jumps wave size by +1 per rank with no per-enemy granularity. The rusher
who buys 3 ranks fast (75c, ~2 runs) faces +3 wave size with still only a
knight — **a self-inflicted spike the design should cushion** by making
the first antagonist unlocks small and cheap (one weak enemy, low coin
multiplier) so the curve stays smooth (proposal P-A below).

### P2 — The Turtle (maxes one class before breadth)

Pours coins into knight-vigor (10c base, ×1.6 growth, 5 ranks: 10,16,26,
41,66 = ~159c over ~3-4 runs). Each rank +10 maxHp → knight at 130hp.
FINDING F3: knight-vigor is the ONLY coin sink reachable at the root
without spending a rose (oldwood-bend, ranger-trail, dragon-wake are all
rose-gated). So a coin-rich turtle who hasn't earned roses can ONLY buy
knight-vigor — a forced single path. **The root should offer at least one
more coin-priced choice** so early coin income has somewhere to go besides
one stat (proposal P-B).

The turtle's knight eventually over-levels the rescue-route trivially
(130hp vs a 60hp dragon). Without harder enemies (F2) the turtle has no
reason to leave map 1 — the enemy-DAG is what creates the pull. **The
turtle exposes that map progression currently has weak pull without the
enemy dial.**

### P3 — The Completionist (breadth-first unlocks)

Buys ranger-trail (1R) and oldwood-bend (1R) early for breadth, then
dragon-wake (2R). Now has knight + ranger — two offensive bodies. Good:
offense-first holds, the completionist always has a line. Reaches
sorcerer-cinder (3R, behind dragon-wake) → which unlocks priest-vows,
warlock-pact, shaman. FINDING F4: **sorcerer-cinder is a CHOKE** — it
gates three different advanced/support classes AND the castle-candle-loop
(the castle track entry, 5R). A completionist must buy the sorcerer to
reach the priest, the warlock, the shaman, AND the castle. That's heavy
load on one node; mis-tuning sorcerer-cinder's cost ripples to four
downstream unlocks. Consider splitting (proposal P-C).

### P4 — The Min-Maxer (chases roses → composites)

Targets the rose economy: rescues pay roses, so the min-maxer farms
rescues and beelines composites (dread-knight 9R, shaman 8R, stormcaller
9R). FINDING F5: composites cost 8-9 roses each; at ~1 rose/rescue that's
8-9 successful runs PER composite. The min-maxer needs the offensive core
to carry many runs first — which the offense-first ordering provides. But
the rose costs may be steep enough to feel like a wall (proposal P-D:
verify the rose-income-vs-composite-cost curve has no late cliff once the
harness models full runs).

## Findings → proposals

- **F1 (wizard has no unlock node):** the wizard is a coded class with a
  temperament but no DAG node — either it's vestigial (the cast conversion
  made wizard→grey-mage a body, but the CLASS still exists) or it needs a
  node. PROPOSAL P-WIZ: add `wizard-focus` as a root-adjacent coin node
  (the third offensive-core class beside knight-vigor and ranger-trail),
  completing the melee→ranged→spells starting trio the offense-first
  doctrine names. This is a real gap the playtest found.
- **F2 (no per-enemy antagonist unlock):** S21.4 is the answer; promote it
  in priority — the rusher and the turtle both reveal the enemy-DAG is the
  PRIMARY missing pull. Without it, maps 2+ have weak draw.
- **F3/P-B (root coin choices too thin):** add one more root coin sink so
  early coin income isn't forced into knight-vigor alone (P-WIZ doubles as
  this — wizard-focus would be coin-priced).
- **F4/P-C (sorcerer-cinder choke):** consider hanging priest/warlock off a
  different parent than sorcerer so support isn't bottlenecked through one
  spell node; or accept the choke if the harness shows the curve stays
  smooth through it.
- **P-A (smooth the first antagonist):** the earliest enemy unlock should
  be a single weak enemy at a small coin multiplier — the bandit the
  rusher wants — so difficulty rises by a small step, never +3 wave size
  at once.

## Harness-measured findings (2026-06-12, runRail across the spine)

The headless harness now plays the real loop, so the persona hypotheses
above are testable. The headline result is decisive:

**F0 — THE GAME HAS NO DIFFICULTY CURVE YET.** A LONE KNIGHT clears every
spine map at 100% win-rate, advance 1.0 (measured: rescue-route, oldwood,
deep-forest, sunken-road all 100%). Adding ranger, wizard, the warband,
barbarian changes nothing — still 100% everywhere. The curve is flat at
trivial. This is not a spike (the design's enemy: jaggedness) but its
opposite — NO pressure at all. The cause is structural and confirms the
user's design instinct: enemies do not scale with player progression, and
the per-enemy unlock dial (S21.4 enemy DAG) does not exist yet, so:
  - waves spawn but the line out-paces them (the march fallback runs the
    front to the goal before waves accumulate);
  - no antagonist-vs-remediation pressure exists, so there is no push-pull,
    no reason to upgrade, no reason to want the next map.

**This makes S21.4 (the enemy DAG) the critical-path balance feature, not
a late polish item.** Until enemies are an unlockable, scaling difficulty
dial, the statistical spike-detection (S19.1b) has nothing to detect — a
flat-100% curve is trivially "smooth." The playtest's primary
contribution is proving the build order: the enemy DAG must precede
meaningful balance tuning. Win-rate must first become a CURVE before we
can assert it has no jagged steps.

Smaller findings (F1-F5) from the config walk remain valid and are tracked
above; F0 supersedes them in priority.

**F6 — THE ENEMY DAG NOW GATES PRESSURE, AND THE GATING IS UNEVEN ACROSS
THE SPINE (2026-06-12, post S21.4 wiring).** With `waveArchetypes` now
filtering region trash by the unlocked set, a minimal 3-class roster that
has unlocked NO enemies plays each spine map differently — exactly the
curve F0 was missing, but not yet tuned flat-to-rising:
  - `rescue-route`/`oldwood`/`sunken-road`/`castle-approach`: line advances,
    fells the authored boss/cast it can reach, banks coins — playable.
  - `deep-forest`: line STALEMATES at advance 0.495 against the kin boss
    (3 classes can't break it in 90s) — a legitimate non-winning run that
    still farms (2 kills, 21 coins). This is the canon's "a win is not
    always guaranteed" working as intended.
  - `castle-hall` (the LAST map): line reaches the princess UNOPPOSED
    (advance 1.0, 0 kills, 0 coins) because its enemies AND kin are gated
    behind unlocks the roster hasn't bought. The final map should be the
    hardest, not a free walk — this is F0's tail: escalation must be
    authored so the LATE spine is not trivially clearable by a bare roster.
The proposal: the per-map kin boss (now config: `dragon-kin-*` nodes) must
spawn as the map's holder so even an enemy-light roster faces the kin wall
at every map; the statistical suite (S19.1b) then samples WITH varying
unlock sets to prove the win-rate curve rises smoothly map-over-map. The
dragon track DAG (rose-OR-gem unlock + might ranks) and the kin rose-yield
scaling are now wired; the remaining gap is spawning the unlocked kin as
the per-map holder and authoring late-spine escalation (S19.2).

## Harness validation plan

The personas above are HYPOTHESES about feel; the statistical harness
(S19.1b) tests them once it models the enemy-unlock and placement
dimensions (F2). Each finding becomes a harness assertion: F-offense (every
reachable class state has a line), F-smooth (no antagonist unlock spikes
the curve), F-solvable (every reachable state farms a foothold).
