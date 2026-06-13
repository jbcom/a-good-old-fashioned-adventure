/**
 * Map DAG progression (docs/RAIL-COMMAND.md §Map DAG — no jumping): the
 * route maps form a strict linear spine; a run plays the player's furthest
 * UNLOCKED map, and the princess always sits at the last unlocked map (or,
 * once the castle node is bought, in the castle at the spine's end). Pure
 * resolution from progress — the loop and HUD read it, never recompute it.
 */
import { incremental } from "../lib/config";
import type { IncrementalProgressState } from "./traits";

/** A map node is unlocked when its route-pack is unlocked (or it is the start). */
function isMapUnlocked(progress: IncrementalProgressState, mapId: string): boolean {
  if (mapId === incremental.loop.startMap) return true;
  const pack = incremental.routePacks.find((p) => p.maps.includes(mapId));
  return pack ? progress.unlockedRoutePackIds.includes(pack.id) : false;
}

/**
 * The furthest map the player has unlocked along the spine — the map a run
 * plays. Strictly successive: stops at the first locked map, so the player
 * can never jump ahead.
 */
export function currentMap(progress: IncrementalProgressState): string {
  const order = incremental.mapDag.order;
  let furthest = order[0];
  for (const mapId of order) {
    if (!isMapUnlocked(progress, mapId)) break;
    furthest = mapId;
  }
  return furthest;
}

/**
 * Where the princess waits: the last unlocked map, unless the castle node is
 * bought — then she is in the castle at the spine's end (the Mario relocation).
 */
export function princessMap(progress: IncrementalProgressState): string {
  if (
    incremental.mapDag.princessAtLastUnlocked &&
    progress.purchasedUpgradeIds.includes(incremental.mapDag.castleNode)
  ) {
    return incremental.mapDag.castleMap;
  }
  return currentMap(progress);
}

/** True when the player has unlocked the entire spine (the castle is reachable). */
export function spineComplete(progress: IncrementalProgressState): boolean {
  const order = incremental.mapDag.order;
  return isMapUnlocked(progress, order[order.length - 1]);
}
