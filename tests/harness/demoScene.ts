/**
 * Test harness: a real overworld slice (river, broken bridge, paths,
 * desert edge) + real palette-swapped cast, used by browser tests to
 * exercise the Stage with genuine content.
 */
import overworldDef from "../../src/content/world/maps/overworld.json";
import { getCharacterSprite } from "../../src/lib/content/registry";
import { tileCanvas } from "../../src/render/atlas";
import { rasterizeRows, resolvePalette } from "../../src/render/pixelart";
import type { StageActor } from "../../src/render/Stage";
import { buildGrid, type MapGenInput } from "../../src/sim/mapgen";

export const TILE = 16;
// Slice: cols 24..44, rows 20..34 → 21×15 tiles → 336×240 px.
export const SLICE = { x0: 24, y0: 20, x1: 44, y1: 34 };
export const SLICE_W = (SLICE.x1 - SLICE.x0 + 1) * TILE;
export const SLICE_H = (SLICE.y1 - SLICE.y0 + 1) * TILE;

export function composeMapSliceCanvas(): HTMLCanvasElement {
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
      let tileSurface = tileCache.get(tileId);
      if (!tileSurface) {
        tileSurface = tileCanvasFor(tileId);
        tileCache.set(tileId, tileSurface);
      }
      ctx.drawImage(tileSurface, (col - SLICE.x0) * TILE, (row - SLICE.y0) * TILE);
    }
  }
  return canvas;
}

function tileCanvasFor(tileId: string): HTMLCanvasElement {
  return tileCanvas(tileId);
}

export function buildDemoActors(): StageActor[] {
  const heroSprite = getCharacterSprite("sprite:hero");
  const dragonSprite = getCharacterSprite("sprite:dragon");
  const princessSprite = getCharacterSprite("sprite:princess");
  const sprite = (rows: string[], paletteId: string) =>
    rasterizeRows(rows, resolvePalette(paletteId));
  return [
    { id: "knight", canvas: sprite(heroSprite.rows, "palette:knight"), x: 120, y: 180 },
    { id: "ranger", canvas: sprite(heroSprite.rows, "palette:ranger"), x: 104, y: 196 },
    { id: "wizard", canvas: sprite(heroSprite.rows, "palette:wizard"), x: 138, y: 168 },
    { id: "woodcutter", canvas: sprite(heroSprite.rows, "palette:woodcutter"), x: 60, y: 140 },
    { id: "orc", canvas: sprite(dragonSprite.rows, "palette:orc"), x: 210, y: 120, flip: true },
    { id: "wyrm", canvas: sprite(dragonSprite.rows, "palette:wyrm"), x: 250, y: 215 },
    { id: "princess", canvas: sprite(princessSprite.rows, "palette:princess"), x: 165, y: 100 },
  ];
}
