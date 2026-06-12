/**
 * Atlas baker: every (asset × palette × state) rasterizes ONCE into a
 * cached canvas; renderers blit textures, never re-parse pixel grids.
 */
import { getProp, getSprite, getTile } from "../lib/content/registry";
import { type DrawOp, rasterizeDrawOps, rasterizeRows, resolvePalette } from "./pixelart";

const cache = new Map<string, HTMLCanvasElement>();

export function clearAtlas(): void {
  cache.clear();
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
export function spriteCanvas(spriteId: string, paletteId: string): HTMLCanvasElement {
  return baked(`${spriteId}|${paletteId}`, () => {
    const sprite = getSprite(spriteId);
    return rasterizeRows(sprite.rows, resolvePalette(paletteId));
  });
}

/** Prop in a named state (chest closed/open, castle default, ...). */
export function propCanvas(propId: string, state: string, paletteId?: string): HTMLCanvasElement {
  const prop = getProp(propId);
  const palette = paletteId ?? prop.defaultPalette;
  return baked(`${propId}|${palette}|${state}`, () => {
    const propState = prop.states[state];
    if (!propState) throw new Error(`${propId}: unknown state ${state}`);
    const resolved = resolvePalette(palette);
    if (propState.rows) return rasterizeRows(propState.rows, resolved);
    return rasterizeDrawOps(propState.drawOps as DrawOp[], resolved, prop.grid.w);
  });
}

/** White silhouette of a sprite — the damage hit-flash frame. */
export function flashCanvas(spriteId: string, paletteId: string): HTMLCanvasElement {
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
