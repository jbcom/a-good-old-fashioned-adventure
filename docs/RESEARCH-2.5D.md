---
title: "Research: 2.5D extrapolation of 16-bit pixel art"
updated: 2026-06-10
status: current
domain: technical
---

# Research: 2.5D extrapolation of 16-bit pixel art (FF7-era)

Question: can AI-drawn 16-bit pixel art (tiles, props, palette-swapped
sprites) be extrapolated into a 2.5D web game with real depth, using
1990s presentation tricks and modern equivalents — at high enough quality
to ship, on a Capacitor/Android target?

Method: adversarially-verified web research (every claim below survived
independent refutation votes; vote counts noted), **plus local validation
spikes rendered from this repo's real content and screenshot-judged**
(`docs/evidence/spike-pixi.png`, `docs/evidence/spike-r3f.png`). Refuted
claims and coverage gaps are listed at the end — they are as load-bearing
as the findings.

## Verified findings

### The HD-2D pattern is the proven shape (3-0)

Billboarded 2D sprites in a 3D scene with a fixed/limited camera is
commercially proven at exactly our art style: Square Enix built HD-2D "to
reproduce the older pixel graphics in a rich way with current technology"
(early prototypes used FF6 sprites) and shipped Octopath Traveler (3M+),
Octopath II, Triangle Strategy, Live A Live, DQ3 HD-2D.
— [Unreal Engine dev interview](https://www.unrealengine.com/en-US/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style)

Its two costs, from the developers who shipped it (3-0):
1. Making flat sprites sit naturally against 3D backgrounds is the core
   difficulty (solved mostly with lighting).
2. **Camera rotation is capped** — Octopath II holds a fixed camera in
   travel, ~90° only in battle effects, ~180° only in cutscenes. A fixed
   camera is the correct default, not a limitation we're settling for.

### Crisp-pixel pipeline (3-0 across sources)

- `NearestFilter` on min AND mag + `generateMipmaps = false` (+
  `SRGBColorSpace`) on every texture — three.js's official pixel example
  wraps all loads in exactly this helper.
  — [threejs webgl_postprocessing_pixel](https://threejs.org/examples/webgl_postprocessing_pixel.html)
- three.js ships first-party low-res-render-then-upscale machinery:
  `RenderPixelatedPass` (EffectComposer addon), and its example solves
  texel-crawl during pans by snapping the camera **frustum** (not
  position) to the virtual pixel grid ("pixelAlignedPanning";
  ortho-camera technique).
- Presentation layer: small canvas + CSS integer upscale +
  `image-rendering: pixelated` is the canonical recipe (MDN).
  — [MDN crisp pixel art](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **Android pitfall (3-0): fractional devicePixelRatio is the NORM on
  Android (2.625 on Pixel-class).** CSS pixels can't map exactly to device
  pixels, so naive upscaling gives non-uniform fat pixels. Mitigation
  required: integer scale factor + letterboxing, or device-pixel-sized
  backing store.

### Library landscape (3-0 unless noted)

- Pixi v8 is the fastest pure 2D web renderer benchmarked (47 FPS @
  10,000 sprites, mid-tier laptop; Jan-2023 v7 measurement, conservative
  test path) — far beyond our needs (~dozens of sprites).
  — [js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)
- "Pixi vs three" is partly a false dichotomy: they can share one WebGL
  context (`pixiRenderer.init({ context: threeRenderer.getContext() })` +
  `resetState()` per handoff; official guide). Textures are NOT shared;
  WebGL-only.
  — [pixijs mixing-three-and-pixi](https://pixijs.com/8.x/guides/third-party/mixing-three-and-pixi)
- Pixi v8 lighting gap: `@pixi/lights` is v7-pinned (npm checked
  2026-06-10), structurally incompatible with v8. Dynamic sprite lighting
  on Pixi v8 means custom shaders.
  — [pixijs-userland/lights](https://github.com/pixijs-userland/lights)
- Normal-map sprite lighting requires a GPU renderer; not viable on
  Canvas 2D at game framerates (2-1 — read as "not viable", not
  "impossible").

### Depth augmentation of flat art (3-0)

Mature tool category, two workflows: automatic single-image normal-map
generation ([Sprite DLight](https://www.kickstarter.com/projects/2dee/sprite-dlight-instant-normal-maps-for-2d-graphics)
alpha-inflation/shape recognition;
[SpriteIlluminator](https://www.codeandweb.com/spriteilluminator)) and
artist-driven lighting profiles
([Sprite Lamp](https://www.snakehillgames.com/spritelamp/): 2-5
hand-drawn profiles → normal/depth/AO maps; depth output drives parallax
and demonstrated self-shadowing). Relevant later for lighting polish;
since our sprites are *generated from pixel grids*, we can compute
normal/height maps procedurally at bake time instead of using external
tools.

## Refuted in verification (do not rely on)

- "Sprite DLight pre-renders all map types without shader support" (1-2).
- "PixiJS supports normal-mapped sprites out of the box" (0-3).
- "@pixi/lights gives working normal-map lighting in current Pixi" (0-3).

## Coverage gaps (no surviving claims — not disproven)

Pre-rendered backgrounds + walkmesh (FF7's literal architecture), y-sort
+ scale-by-depth, parallax layers, dimetric projection, Mode 7 planes,
AI upscaling/ML depth estimation. The local spikes cover y-sort and
scale-by-depth empirically. No verified Android-WebView framerate numbers
exist for any stack — our own Capacitor profiling (S7.1) is the only way
to get them.

## Local spike validation (primary evidence, per mandate)

Same real content (overworld slice + 7 palette-swapped cast sprites)
rendered through both candidates in headed GPU Chromium:

- **pixi 2D** (`docs/evidence/spike-pixi.png`): crisp, correct, flat.
  A competent SNES look — the baseline.
- **r3f 2.5D** (`docs/evidence/spike-r3f.png`): pitched perspective
  camera over a nearest-filtered ground plane, sprites as upright
  billboards. Reads immediately as FF7-era staging: depth recession,
  natural scale-by-depth (princess across the river is visibly farther),
  z-buffer y-sorting for free, pixels stay crisp. Validated to be the
  higher-calibre presentation.

## Decision

**three.js via @react-three/fiber is the sole world renderer (HD-2D
pattern); pixi.js is dropped; HUD/UI is React DOM.** Full rationale and
consequences in `docs/ARCHITECTURE.md` §Renderer.
