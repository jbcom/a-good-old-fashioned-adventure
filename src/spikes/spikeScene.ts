/**
 * Shared scene for the S2.2 renderer spikes: one slice of the real overworld
 * (river, broken bridge, paths, desert edge) plus real cast sprites, so both
 * candidates render IDENTICAL content and the screenshots compare fairly.
 */
import dragonSprite from "../content/sprites/dragon.json";
import heroSprite from "../content/sprites/hero.json";
import princessSprite from "../content/sprites/princess.json";
import overworldDef from "../content/world/maps/overworld.json";
import { type DrawOp, rasterizeDrawOps, rasterizeRows, resolvePalette } from "../render/pixelart";
import { buildGrid, type MapGenInput } from "../sim/mapgen";

export const TILE = 16;
// Slice: cols 24..44, rows 20..34 → 21×15 tiles → 336×240 px.
export const SLICE = { x0: 24, y0: 20, x1: 44, y1: 34 };
export const SLICE_W = (SLICE.x1 - SLICE.x0 + 1) * TILE;
export const SLICE_H = (SLICE.y1 - SLICE.y0 + 1) * TILE;

const tileModules = import.meta.glob<{ id: string; layers: DrawOp[] }>(
  "/src/content/tiles/*.json",
  { eager: true, import: "default" },
);
const tilesById = new Map(Object.values(tileModules).map((t) => [t.id, t]));

/** The map slice composed at native resolution (1px = 1 texel). */
export function composeMapSliceCanvas(): HTMLCanvasElement {
  const palette = resolvePalette("palette:base");
  const grid = buildGrid(overworldDef as MapGenInput);
  const canvas = document.createElement("canvas");
  canvas.width = SLICE_W;
  canvas.height = SLICE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.imageSmoothingEnabled = false;
  const tileCache = new Map<string, HTMLCanvasElement>();
  for (let row = SLICE.y0; row <= SLICE.y1; row++) {
    for (let col = SLICE.x0; col <= SLICE.x1; col++) {
      const tileId = grid[row][col];
      let tileCanvas = tileCache.get(tileId);
      if (!tileCanvas) {
        const tile = tilesById.get(tileId);
        if (!tile) throw new Error(`unknown tile ${tileId}`);
        tileCanvas = rasterizeDrawOps(tile.layers, palette, TILE);
        tileCache.set(tileId, tileCanvas);
      }
      ctx.drawImage(tileCanvas, (col - SLICE.x0) * TILE, (row - SLICE.y0) * TILE);
    }
  }
  return canvas;
}

export interface SpikeActor {
  name: string;
  canvas: HTMLCanvasElement;
  /** Local px inside the slice; y is the FEET line (anchor bottom). */
  x: number;
  y: number;
  flip?: boolean;
}

/** Real cast, palette-swapped, placed to exercise y-sorting and overlap. */
export function buildActors(): SpikeActor[] {
  const sprite = (rows: string[], paletteId: string) =>
    rasterizeRows(rows, resolvePalette(paletteId));
  return [
    { name: "knight", canvas: sprite(heroSprite.rows, "palette:knight"), x: 120, y: 180 },
    { name: "ranger", canvas: sprite(heroSprite.rows, "palette:ranger"), x: 104, y: 196 },
    { name: "wizard", canvas: sprite(heroSprite.rows, "palette:wizard"), x: 138, y: 168 },
    { name: "woodcutter", canvas: sprite(heroSprite.rows, "palette:woodcutter"), x: 60, y: 140 },
    { name: "orc", canvas: sprite(dragonSprite.rows, "palette:orc"), x: 210, y: 120, flip: true },
    { name: "wyrm", canvas: sprite(dragonSprite.rows, "palette:wyrm"), x: 250, y: 215 },
    { name: "princess", canvas: sprite(princessSprite.rows, "palette:princess"), x: 165, y: 100 },
  ];
}
