/**
 * Tile collision against the MapRuntime grid. Solidity comes from tile
 * content; conditional-solid map triggers (e.g. the locked castle gate)
 * consult FlagState at query time so flag flips open the world without
 * regenerating anything.
 */
import type { World } from "koota";
import { getMap, getTile } from "../lib/content/registry";
import { FlagState, MapRuntime } from "./traits";

const TILE = 16;

/** Check if a pixel position hits a solid tile (respects flag-gated triggers). */
export function isSolidTileAt(world: World, px: number, py: number): boolean {
  const runtime = world.get(MapRuntime);
  if (!runtime || runtime.mapId === "") return true;
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (col < 0 || col >= runtime.cols || row < 0 || row >= runtime.rows) return true;

  const mapDef = getMap(runtime.mapId);
  const flagValues = world.get(FlagState)?.values ?? {};
  for (const trigger of mapDef.triggers ?? []) {
    if (trigger.kind !== "conditional-solid" || !trigger.solidUnlessFlag) continue;
    if (flagValues[trigger.solidUnlessFlag]) continue;
    if (trigger.tiles?.some(([tx, ty]) => tx === col && ty === row)) return true;
  }

  return getTile(runtime.grid[row][col]).solid;
}

/** Prototype-faithful 4-point probe: top corners at y-h/2, sides at y. */
export function collides(world: World, x: number, y: number, w: number, h: number): boolean {
  const points = [
    [x - w / 2, y - h / 2],
    [x + w / 2, y - h / 2],
    [x - w / 2, y],
    [x + w / 2, y],
  ] as const;
  return points.some(([px, py]) => isSolidTileAt(world, px, py));
}
