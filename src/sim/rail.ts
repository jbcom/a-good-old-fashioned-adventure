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
import { frontline, railAxis } from "./systems/waves";
import { MapRuntime } from "./traits";

/** Road waypoint center along the rail's advance axis. */
export interface RailPoint {
  triggerId: string;
  x: number;
  y: number;
}

/** Road-waypoint zone centers, ordered from the start toward the goal. */
export function getRail(mapId: string, axis: "north" | "east" = "north"): RailPoint[] {
  const triggers = getMap(mapId).triggers ?? [];
  const points = triggers
    .filter((trigger) => trigger.kind === "road-waypoint" && trigger.zone)
    .map((trigger) => {
      const zone = trigger.zone as { x0: number; y0: number; x1: number; y1: number };
      return {
        triggerId: trigger.id,
        x: (zone.x0 + zone.x1) / 2,
        y: (zone.y0 + zone.y1) / 2,
      };
    });
  // order from the start edge toward the goal: north climbs (largest y first),
  // east runs (smallest x first)
  return axis === "east" ? points.sort((a, b) => a.x - b.x) : points.sort((a, b) => b.y - a.y);
}

/** The next rail point ahead of a position along the axis, if any. */
export function nextRailPoint(
  rail: RailPoint[],
  from: { x: number; y: number },
  axis: "north" | "east" = "north",
): RailPoint | null {
  for (const point of rail) {
    if (axis === "east" ? point.x > from.x + 4 : point.y < from.y - 4) return point;
  }
  return null;
}

const crossings = new WeakMap<World, Set<string>>();

/**
 * Front-crossing checkpoints: when the front passes a rail point (along the
 * map's advance axis), emit the zone:entered event the player's body used to
 * trigger — the once-per-run wallet guard in applyRoadTravelled handles the
 * rest. Axis-agnostic: north crossings test y, east crossings test x.
 */
export function railStep(world: World): void {
  const mapId = world.get(MapRuntime)?.mapId ?? "";
  if (!mapId) return;
  const front = frontline(world);
  if (!front) return;
  const axis = railAxis(world);
  let seen = crossings.get(world);
  if (!seen) {
    seen = new Set();
    crossings.set(world, seen);
  }
  for (const point of getRail(mapId, axis)) {
    const key = `${mapId}:${point.triggerId}`;
    if (seen.has(key)) continue;
    const crossed = axis === "east" ? front.x >= point.x : front.y <= point.y;
    if (crossed) {
      seen.add(key);
      pushEvent(world, { type: "zone:entered", mapId, triggerId: point.triggerId });
    }
  }
}
