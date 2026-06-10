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

/** Tile face (16×16 draw-ops at the base palette). */
export function tileCanvas(tileId: string): HTMLCanvasElement {
  return baked(`${tileId}|palette:base`, () => {
    const tile = getTile(tileId);
    return rasterizeDrawOps(tile.layers as DrawOp[], resolvePalette("palette:base"));
  });
}
