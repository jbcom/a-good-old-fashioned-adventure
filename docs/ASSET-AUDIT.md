---
title: Asset Audit — used vs unused inventory
updated: 2026-06-13
status: current
domain: creative
---

# Asset Audit

A content-hash audit of `raw-assets/extracted` against the staged
`public/assets`, so the unused candidate pool is visible by subtraction. The
consumed files (content-matched to staged assets) were removed from raw-assets,
leaving each pack's UNUSED remainder. They remain re-fetchable via
`scripts/fetch-itch-assets.mjs`.

## Method

Hash every staged `public/assets` media file; hash every
`raw-assets/extracted` media file; a raw file whose content hash matches a
staged file is CONSUMED. 93 consumed files were removed; **5055 unused media
files remain** as the candidate pool.

## Consumed packs (partially) — what's in the game

Every consumed pack is only PARTIALLY used, so the pack stays in raw-assets with
its remainder. Notable: the 2d-pixel-art animal packs (fully consumed, 1:1),
citizens-guards-warriors (19/40), warriors_rogues_mages (9/57), the footstep /
ambient / magic / inventory / impact SFX (a handful each of hundreds), the
victory stingers (2/49), Roguelike Interior/Dungeon (1/4 each).

## Fully-UNUSED packs — the candidate pool

### Terrain / tiles (the priority for the procedural-terrain replacement)
- **RPG Tiles Vector** (233) — clean grass / grass-to-dirt autotile / dirt /
  water as large seamless blocks. Best terrain set; SMOOTH VECTOR style (less
  16-bit-pixel than the rest of the game — a cohesion consideration).
- **RTS Medieval (Pixel)** (211) — pixel grass / water / sand / dirt + autotile
  transitions, trees/bushes/rocks. Good PIXEL terrain, RTS flat-color style.
- **RTS Medieval** (258) — the higher-res / vector RTS variant.
- **Roguelike City Pack** (1040) — the Kenney roguelike family (same art as the
  staged `roguelike.png` mega-sheet), individual tile PNGs; roads/grounds in the
  16-bit style that BEST matches the game's existing tiles. Grass here is
  tuft-overlays + dithered fills (like the current .pix grass), not a solid
  grass block.
- **Brick Pack** (475) — wall/brick textures.
- **Retro Textures Fantasy** (119) — building textures (walls/roofs/timber).
- **Roguelike Base Pack** (5) — the roguelike mega-sheet variants.

### Overlays
- **Foliage Pack** (218) + **Foliage Sprites** (102) — trees, plants, leaves.

### Icons
- **Rune Pack** (667) — the rune iconography (a DAG-icon alternative).

### Audio (unused)
- gameloops-vol4-darkambient (31), gameloops-vol5-fantasyrpg (30),
  pixelloops-main-menu (21), pixelloops-boss-battle (25), pixelloops-combat
  (25), retro-dungeon-music (25), weapon-laser-sfx (94), most of explosion (69).

## Terrain-replacement finding (the procedural .pix → PNG task)

The procedural `.pix` terrain (44 tiles: grass/path/sand/stone/leaf-litter/
castle-road/etc.) was POC scaffolding to replace with real PNG ground. Key
finding from rendering each candidate:

- `tilemaps/ground.png` ("The Ground", staged but NEVER wired) is a
  cliff/stone/dirt/sand AUTOTILE + dither pack — great dirt/stone/sand fills,
  **NO grass**. Its top "fills" are transparency-DITHER overlays (for blending),
  not solid ground — tiling one cell shows static/seams.
- A `field` ground-render mode was added (sheet `field:{cols,rows}` +
  `tileFieldCanvas`): a multi-cell ground tile samples a per-(col,row) cell so a
  large pack texture reproduces seamlessly instead of a seamed single-cell
  repeat. This is the renderer fitting the asset's authoring, not vice-versa.

The clean grass is in **RPG Tiles Vector** (vector) and **RTS Medieval (Pixel)**
(pixel); the road/stone/sand is strong in **The Ground**; the style-closest
ground is **roguelike.png / Roguelike City**. The terrain wiring proceeds
region-by-region from these, each READ at game scale before commit.
