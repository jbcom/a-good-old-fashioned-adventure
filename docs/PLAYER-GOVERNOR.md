---
title: Player Governor
updated: 2026-06-11
status: current
domain: testing
---

# Player Governor

The long browser playthrough uses a test-side player governor. Enemy and NPC
behavior belongs to the sim through Yuka-backed systems; the player governor
belongs to validation. Its job is to prove the shipped journey can be completed
through the same controls and signals a player receives.

## Contract

- The governor may press only player controls: directional input, A, B, and
  visible UI buttons.
- The governor may perceive only public player-facing state: title/landing
  screens, HUD map text, dialogue text, quest text when the quest panel is
  open, minimap pixels, and visible buttons.
- Shell `data-*` state may be used for route steering and failure diagnostics
  while minimap vision is still coarse, but success must be asserted through
  player-facing state such as map labels, dialogue, HUD text, and screens.
- The governor never writes sim state, never teleports, never invokes content
  factories, and never calls production combat, dialogue, or movement systems
  directly.
- Browser playthrough tests must grow this governor instead of adding brittle
  one-off sleep scripts.

## GOAP Shape

The governor is goal-directed, not a single hard-coded macro. Each browser
test declares:

- **Perception:** a snapshot of visible UI and optional diagnostic fields.
- **Goal:** an observable desired state, such as "HUD map includes Cottage
  Interior" or "dialogue contains kingdom is saved".
- **Actions:** low-level button acts with preconditions and costs, such as
  hold right, hold down, press A, press B, or open the side panel.

The current harness uses a receding-horizon GOAP loop: perceive, check the
goal, choose the cheapest available action, execute it through real input, and
perceive again. More advanced route planning can add action effects and
map/minimap inference without changing the central rule: the governor is a
player, not a backdoor.

The expanded governor keeps the planner explicit. A test may declare an
`AdventurePlan` with named goals such as "enter the tavern" and "talk to the
keeper of song"; each step supplies one or more public actions. The runner
perceives before every step, skips already-satisfied goals, chooses the cheapest
available action, and records the public state history on failure. This is
still deliberately modest GOAP: it is enough to prove that content-authored
affordances can be reached and used without private sim mutation, while leaving
enemy/NPC intelligence inside Yuka-backed runtime systems.

For close-range NPC interactions, browser specs should prefer coordinate
steering through `reachPoint` over fixed-duration holds. The helper reads the
shell coordinates to decide which directional button to hold, but it still
moves only through public controls and still verifies the outcome with visible
dialogue text. This prevents tiny authored spaces, such as shop counters with
two nearby speakers, from becoming timing-dependent in headed CI.

## AI vs AI Validation

This makes the playthrough closer to an AI-vs-AI exercise:

- Yuka and sim systems govern enemies and NPC movement/combat behavior.
- The player governor governs the validating player through input only.
- The browser test observes whether the authored journey remains playable when
  both sides operate through their real runtime surfaces.

Every expansion slice should add at least one governor capability or goal that
matches the new player journey depth: interiors, exterior roads, combat
encounters, minimap use, quest routing, shops, and final victory.
