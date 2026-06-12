/**
 * Pure map-grid builder: interprets a map definition's `generation` op list
 * (docs/CONTENT-ARCHITECTURE.md §world) into a rows×cols grid of tile IDs.
 *
 * Semantics:
 * - Ops apply in array order; later ops overwrite earlier cells.
 * - `border` paints the outer ring.
 * - `col`/`row` paint INTERIOR cells only (the border ring always wins over
 *   full-length strokes — matches the prototype's generation loops).
 * - `col-span`/`row-span`/`region`/`set` use explicit inclusive ranges.
 * - `region` records its cells under the tile's local name; a later op with
 *   `unlessRegion: "<name>"` skips those cells.
 */

export interface GenOp {
  op: "border" | "col" | "row" | "col-span" | "row-span" | "region" | "set";
  tile: string;
  x?: number;
  y?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  at?: [number, number];
  exceptRows?: number[];
  exceptCols?: number[];
  unlessRegion?: string;
  note?: string;
}

import type { TerrainVariantRule } from "../lib/content/types";

export type { TerrainVariantRule } from "../lib/content/types";

export interface MapGenInput {
  size: { cols: number; rows: number };
  baseTile: string;
  generation: GenOp[];
  terrainVariants?: TerrainVariantRule[];
}

const localName = (tileId: string) => tileId.split(":")[1] ?? tileId;

function chunkHash(x: number, y: number, seed: number): number {
  let value = seed ^ Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + 0xc2b2ae35, 0x27d4eb2f);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return value >>> 0;
}

function applyTerrainVariants(grid: string[][], rules: TerrainVariantRule[]): void {
  if (!rules.length) return;
  const byBase = new Map(rules.map((rule) => [rule.baseTile, rule]));
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x++) {
      const rule = byBase.get(grid[y][x]);
      if (!rule) continue;
      const chunkX = Math.floor(x / rule.chunk.w);
      const chunkY = Math.floor(y / rule.chunk.h);
      const index = chunkHash(chunkX, chunkY, rule.seed) % rule.variants.length;
      grid[y][x] = rule.variants[index];
    }
  }
}

export function buildGrid(def: MapGenInput): string[][] {
  const { cols, rows } = def.size;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(def.baseTile));
  const regions = new Map<string, Set<number>>();
  const cellKey = (x: number, y: number) => y * cols + x;

  const paint = (x: number, y: number, op: GenOp) => {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    if (op.exceptRows?.includes(y) || op.exceptCols?.includes(x)) return;
    if (op.unlessRegion && regions.get(op.unlessRegion)?.has(cellKey(x, y))) return;
    grid[y][x] = op.tile;
  };

  for (const op of def.generation) {
    switch (op.op) {
      case "border": {
        for (let x = 0; x < cols; x++) {
          paint(x, 0, op);
          paint(x, rows - 1, op);
        }
        for (let y = 0; y < rows; y++) {
          paint(0, y, op);
          paint(cols - 1, y, op);
        }
        break;
      }
      case "col": {
        for (let y = 1; y < rows - 1; y++) paint(op.x as number, y, op);
        break;
      }
      case "row": {
        for (let x = 1; x < cols - 1; x++) paint(x, op.y as number, op);
        break;
      }
      case "col-span": {
        for (let y = op.y0 as number; y <= (op.y1 as number); y++) paint(op.x as number, y, op);
        break;
      }
      case "row-span": {
        for (let x = op.x0 as number; x <= (op.x1 as number); x++) paint(x, op.y as number, op);
        break;
      }
      case "region": {
        const cells = regions.get(localName(op.tile)) ?? new Set<number>();
        for (let y = op.y0 as number; y <= (op.y1 as number); y++) {
          for (let x = op.x0 as number; x <= (op.x1 as number); x++) {
            paint(x, y, op);
            cells.add(cellKey(x, y));
          }
        }
        regions.set(localName(op.tile), cells);
        break;
      }
      case "set": {
        const [x, y] = op.at as [number, number];
        paint(x, y, op);
        break;
      }
    }
  }
  applyTerrainVariants(grid, def.terrainVariants ?? []);
  return grid;
}
