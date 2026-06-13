/**
 * Atlas baker: every (asset × palette × state) rasterizes ONCE into a
 * cached canvas; renderers blit textures, never re-parse pixel grids.
 * Two raster backends (docs/CONTENT-ARCHITECTURE.md §Purchased PNG sheet
 * sprites): palette-keyed .pix rows, and purchased PNG sheets whose images
 * preload once at boot so every bake stays synchronous.
 */
import { getProp, getSprite, getTile, props, sprites } from "../lib/content/registry";
import { isSheetSprite, resolveSheetFrame, type SheetFrame } from "../lib/content/sheetSprite";
import type { SheetSpriteDef } from "../lib/content/types";
import { type DrawOp, rasterizeDrawOps, rasterizeRows, resolvePalette } from "./pixelart";

const cache = new Map<string, HTMLCanvasElement>();
const sheetImages = new Map<string, HTMLImageElement>();

export function clearAtlas(): void {
  cache.clear();
}

let sheetPreload: Promise<void> | null = null;
let sheetsReady = false;

/**
 * Load every image referenced by registered sheet sprites — idempotent,
 * kicked at stage mount. While loading, sheetFrameCanvas degrades to an
 * uncached transparent frame (a sprite pops in a frame late); once loading
 * has completed, a missing image is a content bug and fails loud.
 */
export function preloadSheetImages(): Promise<void> {
  sheetPreload ??= (async () => {
    const paths = new Set<string>();
    for (const def of sprites.values()) {
      if (!isSheetSprite(def)) continue;
      for (const anim of Object.values(def.animations)) paths.add(anim.image);
    }
    for (const prop of props.values()) {
      for (const state of Object.values(prop.states)) {
        if (state.sheet) paths.add(state.sheet.image);
      }
    }
    await Promise.all(
      [...paths].map(async (path) => {
        const image = new Image();
        image.src = `/assets/${path}`;
        await image.decode();
        sheetImages.set(path, image);
      }),
    );
    sheetsReady = true;
  })();
  return sheetPreload;
}

/** One frame of a sheet sprite, cropped from the preloaded strip. */
export function sheetFrameCanvas(def: SheetSpriteDef, frame: SheetFrame): HTMLCanvasElement {
  const image = sheetImages.get(frame.anim.image);
  if (!image) {
    if (sheetsReady) throw new Error(`${def.id}: sheet image missing: ${frame.anim.image}`);
    // preload in flight (or impossible, e.g. jsdom) — blit nothing, never
    // stale; cached per sprite so the render loop doesn't churn textures
    return baked(`${def.id}|placeholder`, () => {
      const placeholder = document.createElement("canvas");
      placeholder.width = def.frameSize.w;
      placeholder.height = def.frameSize.h;
      return placeholder;
    });
  }
  const key = `${def.id}|${frame.anim.image}|${frame.sourceX},${frame.sourceY}`;
  return baked(key, () => {
    const canvas = document.createElement("canvas");
    canvas.width = def.frameSize.w;
    canvas.height = def.frameSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      frame.sourceX,
      frame.sourceY,
      def.frameSize.w,
      def.frameSize.h,
      0,
      0,
      def.frameSize.w,
      def.frameSize.h,
    );
    return canvas;
  });
}

function baked(key: string, bake: () => HTMLCanvasElement): HTMLCanvasElement {
  let canvas = cache.get(key);
  if (!canvas) {
    canvas = bake();
    cache.set(key, canvas);
  }
  return canvas;
}

/** Character sprite at a palette (knight/ranger/wizard/orc/... swaps). */
export function spriteCanvas(
  spriteId: string,
  paletteId: string,
  pose = "idle",
): HTMLCanvasElement {
  const sprite = getSprite(spriteId);
  if (isSheetSprite(sprite)) {
    // palette swaps never apply to purchased sheets; static consumers
    // (HUD portraits, emblems) get the right-facing first frame of the pose
    return sheetFrameCanvas(
      sprite,
      resolveSheetFrame(sprite, { pose, choreoPhase: "", facingDir: 1, moveX: 0, moveY: 0, t: 0 }),
    );
  }
  return baked(`${spriteId}|${paletteId}|${pose}`, () => {
    // sprites without an authored pose frame fall back to the base rows
    const rows = sprite.frames?.[pose] ?? sprite.rows;
    return rasterizeRows(rows, resolvePalette(paletteId));
  });
}

/** Prop in a named state (chest closed/open, castle default, ...). */
export function propCanvas(propId: string, state: string, paletteId?: string): HTMLCanvasElement {
  const prop = getProp(propId);
  const palette = paletteId ?? prop.defaultPalette;
  const propState = prop.states[state];
  if (!propState) throw new Error(`${propId}: unknown state ${state}`);
  if (propState.sheet) {
    const rect = propState.sheet;
    const image = sheetImages.get(rect.image);
    if (!image) {
      if (sheetsReady) throw new Error(`${propId}: sheet image missing: ${rect.image}`);
      return baked(`${propId}|placeholder`, () => {
        const placeholder = document.createElement("canvas");
        placeholder.width = rect.w;
        placeholder.height = rect.h;
        return placeholder;
      });
    }
    return baked(`${propId}|sheet|${state}`, () => {
      const canvas = document.createElement("canvas");
      canvas.width = rect.w;
      canvas.height = rect.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      return canvas;
    });
  }
  return baked(`${propId}|${palette}|${state}`, () => {
    const resolved = resolvePalette(palette);
    if (propState.rows) return rasterizeRows(propState.rows, resolved);
    return rasterizeDrawOps(propState.drawOps as DrawOp[], resolved, prop.grid.w);
  });
}

/** White silhouette of a sprite — the damage hit-flash frame. */
export function flashCanvas(spriteId: string, paletteId: string): HTMLCanvasElement {
  // a sheet sprite mid-preload would bake a blank flash into the cache
  // forever — hand back the uncached placeholder until images are ready
  const def = getSprite(spriteId);
  if (isSheetSprite(def) && !sheetsReady) return spriteCanvas(spriteId, paletteId);
  return baked(`${spriteId}|${paletteId}|flash`, () => {
    const source = spriteCanvas(spriteId, paletteId);
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(source, 0, 0);
    // bright silhouette pulse that keeps a hint of the sprite's inner detail
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    return canvas;
  });
}

/** Tile face (16×16 draw-ops at the base palette). */
export function tileCanvas(tileId: string): HTMLCanvasElement {
  return baked(`${tileId}|palette:base`, () => {
    const tile = getTile(tileId);
    if (tile.rows) return rasterizeRows(tile.rows, resolvePalette("palette:base"));
    return rasterizeDrawOps(tile.layers as DrawOp[], resolvePalette("palette:base"));
  });
}
