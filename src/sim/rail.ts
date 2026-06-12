/**
 * The rail (docs/RAIL-COMMAND.md §rail): a map's designed route of travel,
 * derived from its road-waypoint zones ordered south → north. Units advance
 * along it when no enemy is in perception; the camera follows the front;
 * checkpoint crossings by the FRONT pay roadTravelled through the same
 * zone:entered events the walking player produced.
 */
import type { World } from "koota";
import { getMap } from "../lib/content/registry";
import { pushEvent } from "./events";
import { frontline } from "./systems/waves";
import { MapRuntime } from "./traits";

export interface RailPoint {
  triggerId: string;
  x: number;
  y: number;
}

/** Road-waypoint zone centers, southmost (largest y) first. */
export function getRail(mapId: string): RailPoint[] {
  const triggers = getMap(mapId).triggers ?? [];
  return triggers
    .filter((trigger) => trigger.kind === "road-waypoint" && trigger.zone)
    .map((trigger) => {
      const zone = trigger.zone as { x0: number; y0: number; x1: number; y1: number };
      return {
        triggerId: trigger.id,
        x: (zone.x0 + zone.x1) / 2,
        y: (zone.y0 + zone.y1) / 2,
      };
    })
    .sort((a, b) => b.y - a.y);
}

/** The next rail point strictly north of a position, if any. */
export function nextRailPoint(rail: RailPoint[], from: { y: number }): RailPoint | null {
  for (const point of rail) {
    if (point.y < from.y - 4) return point;
  }
  return null;
}

const crossings = new WeakMap<World, Set<string>>();

/**
 * Front-crossing checkpoints: when the northmost unit passes a rail point,
 * emit the zone:entered event the player's body used to trigger — the
 * once-per-run wallet guard in applyRoadTravelled handles the rest.
 */
export function railStep(world: World): void {
  const mapId = world.get(MapRuntime)?.mapId ?? "";
  if (!mapId) return;
  const front = frontline(world);
  if (!front) return;
  let seen = crossings.get(world);
  if (!seen) {
    seen = new Set();
    crossings.set(world, seen);
  }
  for (const point of getRail(mapId)) {
    const key = `${mapId}:${point.triggerId}`;
    if (seen.has(key)) continue;
    if (front.y <= point.y) {
      seen.add(key);
      pushEvent(world, { type: "zone:entered", mapId, triggerId: point.triggerId });
    }
  }
}
