---
title: Cast Conversion Matrix
updated: 2026-06-12
status: current
domain: creative
---

# Cast Conversion Matrix (SA.5b)

User mandate (2026-06-12): purchased sheets become the primary art source
for the entire cast; procedural/bespoke art phases out wherever a sheet
fits; identities may be REWRITTEN to match the material ("if you don't
have a bard, get creative about different kinds of mages"); explore all
the possibilities.

Material pool: Electric Lemon Pixel Grit series (12 states × 4 directions
× 4 frames per character; 16px base, combat sets up to 32px) — 14 named
citizens (each with combat variant), 3 guards (spearman/archer/swordsman),
warriors (sword+shield, 2-handed, axe, skullcap, caped), Paladin (thrust +
dash + attack fx), Heavy Knight, 2 rogues (hooded/unhooded, daggers+bow),
3 mages (red fem, hooded brown, old grey masc), 11 spellcasting fx × 3
intensities + 5 elemental fx + slash/staff swing fx. Plus the Elthen
menagerie (wired), High Dragon (wired), Kenney roguelike characters sheet
(modular 16px bodies — skeleton candidates), and the Backterria mega-sheet.

## Player classes

| Class | Today | Becomes | Notes |
| --- | --- | --- | --- |
| knight | hero swap | **Sword & Shield Fighter** | straight fit |
| ranger | hero swap | **Warrior Archer** | straight fit |
| wizard | hero swap | **Old Grey Mage** | classic wizard body |
| rogue (locked) | hero swap | **Rogue (daggers+bow)** | body exists — unlock becomes content-ready |
| bard (locked) | hero swap | **Red Mage rewritten as the Spellsinger** | creative: no bard sheet → the red female mage becomes a battle-chanter whose "spells" are verses; flavor text rewrites |
| sorcerer (locked) | hero swap | **Hooded Rogue rewritten as the Veilwalker** | creative: hooded mage body is taken by enemy shamans — the hooded rogue (daggers sheathed, bow stowed) reads as a shadow-caster with the pack's red-energy fx |

## Deployable units (rail-command)

| Unit | Today | Becomes | Notes |
| --- | --- | --- | --- |
| priest | bespoke .pix | **Paladin rewritten as the War-Cleric** | thrust + holy attack fx read liturgical; heal glow from spellcasting fx |
| warlock | bespoke .pix | **Hooded Mage + red-energy fx** | shares the body with enemy shamans intentionally — warlocks walk both sides of the story; tint shifts via fx, not palette |
| barbarian | bespoke .pix | **Axe Warrior** | straight fit |
| dread-knight | bespoke .pix | **Heavy Knight** | straight fit, thrust/dash attacks included |
| shaman (unit) | bespoke .pix | **Skullcap Warrior rewritten as the Rite-Keeper** | creative: martial ritualist; elemental fx carry the magic read |
| stormcaller | bespoke .pix | **Grey Mage + lightning blast fx** | the pack ships the lightning |

## Enemies

| Archetype | Today | Becomes | Notes |
| --- | --- | --- | --- |
| forest-orc | dragon swap | **2-Handed Swordsman as the Oldwood Bandit** | creative REWRITE: the storybook's "orcs" were always masked highwaymen — quest copy updates |
| orc-scout | dragon swap | **Rogue (bow) as the Bandit Scout** | ranged trash |
| oldwood-raider | dragon swap | **Hooded Rogue as the Briar Raider** | |
| forest-shaman / thorn-shaman | hooded mage ✓ | wired | |
| bramble-stalker | boar-dark ✓ | wired | |
| gate-sentry | hero swap | **Guard Spearman** | |
| crypt-skeleton / crypt-sentry | hero swaps | **Kenney roguelike characters skeleton** if it passes audition; else bespoke survivor | the one likely .pix survivor in the trash tier |
| shadow-warlord | dragon swap | **Caped Warrior as the Shadow Warlord** | the dark cape IS the silhouette |
| banner-knight | bespoke boss | keep bespoke | identity-bearing miniboss |
| desert-wyrm, bramble-tyrant, glowcap-matron, armory-sentinel, lectern-shade | bespoke boss | keep bespoke | the audit rated bosses.pix clear; bespoke where identity demands it |
| dragon-guardian | high-dragon ✓ | wired | |
| dune-adder, carrion-raven, gatehouse-vulture, crypt-bat, cellar-rat | Elthen ✓ | wired | |

## Named cast (NPCs)

Every hero-palette NPC maps to one of the 14 named citizen bodies — the
citizens ship with personalities in their silhouettes (aprons, satchels,
hoods). Assignment happens per-character at wiring time with the zoom
read; the princess keeps her bespoke sprite (identity-bearing, audit:
clear), Gwydion takes the Old Grey Mage. dungeon-guard takes Guard
Swordsman. Companion knight/ranger/wizard follow their classes.

## FX phase-out

effects.pix projectiles/swings retire in favor of the pack's slash +
staff swing fx and elemental bursts (fire/ice/lightning at three
intensities); S20.2's deploy puff / heal glow / wither wisp come from the
spellcasting set. Pickups stay .pix (tiny, clear, palette-swapped by
item rarity — sheets don't recolor).

## Survivors (bespoke .pix stays, justified)

hero (until classes wire), princess, the five clear bosses,
upgrades.pix emblems (UI iconography, palette-coupled), pickups,
terrain.pix until the Kenney dungeon/interior audition lands.

## Sheet pinning notes (running)

- **Sword & Shield Fighter combat (128×640, 32px, 20 rows):** a
  multi-weapon sheet — rows 0-11 are the sword+shield kit (slashes,
  blocks, stances), rows 12-19 a BOW kit (draw rows 12-13, bow-walk
  16-19). Direction packing differs from the mage convention: rows mix
  left-facing and right-facing frames across their four columns —
  per-row pinning needed before the def is authored (frames may be
  2-per-direction, not 4). The class def should mount the sword kit;
  the bow rows are a free second weapon read for a knight bow moment
  or a separate body variant.
- **Mage combat (64×256, 16px, 16 rows):** E/W/S/N row blocks ×4
  states — pinned and shipped (sprite:hooded-mage).
- **Archer combat (128×256, 32px, 8 rows):** 2 state-blocks; same
  per-row audit needed as the fighter.

## Execution order

1. Classes — COMPLETE: knight → sprite:fighter, wizard → sprite:grey-mage, ranger → sprite:archer (all three playable bodies purchased; rows pinned per sheet with skin-pixel back-row confirmation; directionRows generalized to {row,col} cells for two-directions-per-row attack packing; companions inherit class sprites automatically; 33 browser + 722 unit tests green, players verified in stage screenshots and runtime SpriteRef assertions).
2. Guards + bandit rewrite (gate-sentry, orc family + quest copy).
3. Units (paladin/axe/heavy-knight/mages + fx).
4. Citizens → named NPCs (per-body zoom assignment).
5. FX swap + locked-class creative unlocks (Spellsinger, Veilwalker).
