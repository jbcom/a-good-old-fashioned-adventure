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
 * The deepest unlocked Dragon's Lair room for a map (docs/RAIL-COMMAND.md §Each
 * map's FOUR sub-tracks), or null when the map's lair is not unlocked. Walks
 * the lair room nodes (rose-OR-gem) the player has purchased and returns the
 * highest-depth one's room rail — that is where the princess (and the dragon,
 * if its kin is unlocked) has relocated to.
 */
export function deepestLairRoom(
  progress: IncrementalProgressState,
  mapId: string,
): { roomMap: string; depth: number } | null {
  let deepest: { roomMap: string; depth: number } | null = null;
  for (const node of incremental.upgradeGraph.nodes) {
    const room = node.lairRoom;
    if (!room || room.mapId !== mapId) continue;
    if (!progress.purchasedUpgradeIds.includes(node.id)) continue;
    if (!deepest || room.depth > deepest.depth) {
      deepest = { roomMap: room.roomMap, depth: room.depth };
    }
  }
  return deepest;
}

/**
 * Where the princess waits. Priority (docs/RAIL-COMMAND.md §Each map's FOUR
 * sub-tracks): if the current map's Dragon's Lair is unlocked, she is in its
 * deepest unlocked room (the lair relocation). Otherwise the castle relocation
 * (castle node bought → the castle at the spine's end). Otherwise the last
 * unlocked map.
 */
export function princessMap(progress: IncrementalProgressState): string {
  const here = currentMap(progress);
  const lairRoom = deepestLairRoom(progress, here);
  if (lairRoom) return lairRoom.roomMap;
  if (
    incremental.mapDag.princessAtLastUnlocked &&
    progress.purchasedUpgradeIds.includes(incremental.mapDag.castleNode)
  ) {
    return incremental.mapDag.castleMap;
  }
  return here;
}

/**
 * The spine map whose Dragon's Lair contains `roomMap`, or null if `roomMap`
 * is not a lair room. Lets a lair room learn which map's kin holds the
 * princess there (docs/RAIL-COMMAND.md §Each map's FOUR sub-tracks).
 */
export function lairParentMap(roomMap: string): string | null {
  const lairs = incremental.mapLairs ?? {};
  for (const [mapId, lair] of Object.entries(lairs)) {
    if (lair.rooms.includes(roomMap)) return mapId;
  }
  return null;
}

/** True when the player has unlocked the entire spine (the castle is reachable). */
export function spineComplete(progress: IncrementalProgressState): boolean {
  const order = incremental.mapDag.order;
  return isMapUnlocked(progress, order[order.length - 1]);
}
