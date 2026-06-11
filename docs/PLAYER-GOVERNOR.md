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
- Shell `data-*` state may be used for failure diagnostics, but it must not be
  the planning source for success.
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

## AI vs AI Validation

This makes the playthrough closer to an AI-vs-AI exercise:

- Yuka and sim systems govern enemies and NPC movement/combat behavior.
- The player governor governs the validating player through input only.
- The browser test observes whether the authored journey remains playable when
  both sides operate through their real runtime surfaces.

Every expansion slice should add at least one governor capability or goal that
matches the new player journey depth: interiors, exterior roads, combat
encounters, minimap use, quest routing, shops, and final victory.
