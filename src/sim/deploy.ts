/**
 * Toolbox deployment (docs/RAIL-COMMAND.md §controls): the single gameplay
 * gesture. A drop spends one roster slot and lands the unit on the rail
 * band south of the front — placement is sim state, so journeys and the
 * HUD read the same counts.
 */
import type { Entity, World } from "koota";
import { spawnUnit } from "./factories";
import { rosterFor } from "./incrementalProgress";
import { getRail } from "./rail";
import { frontline } from "./systems/waves";
import { IncrementalProgress, MapRuntime, RosterPlaced } from "./traits";

export function placedCounts(world: World): Record<string, number> {
  return world.get(RosterPlaced)?.counts ?? {};
}

export function remainingFor(world: World, classId: string): number {
  const progress = world.get(IncrementalProgress);
  if (!progress) return 0;
  const entry = rosterFor(progress).find((slot) => slot.classId === classId);
  if (!entry) return 0;
  return Math.max(0, entry.count - (placedCounts(world)[classId] ?? 0));
}

/** Where a drop lands: the rail band just south of the front (or the rail's southern start). */
export function deployPosition(world: World): { x: number; y: number } {
  const mapId = world.get(MapRuntime)?.mapId ?? "";
  const rail = mapId ? getRail(mapId) : [];
  const south = rail[0] ?? { x: 160, y: 900 };
  const front = frontline(world);
  const anchor = front ?? south;
  const placedTotal = Object.values(placedCounts(world)).reduce((a, b) => a + b, 0);
  // stagger drops so the line forms instead of stacking
  return {
    x: anchor.x + (placedTotal % 3) * 16 - 16,
    y: anchor.y + 28 + Math.floor(placedTotal / 3) * 14,
  };
}

/** Deploy one unit of a class if the roster still has it. */
export function deployUnit(world: World, classId: string): Entity | null {
  if (remainingFor(world, classId) <= 0) return null;
  const at = deployPosition(world);
  const unit = spawnUnit(world, classId, at.x, at.y);
  const placed = world.get(RosterPlaced);
  if (placed) {
    world.set(RosterPlaced, {
      counts: { ...placed.counts, [classId]: (placed.counts[classId] ?? 0) + 1 },
    });
  }
  return unit;
}

/** A fresh run resets the roster spend. */
export function resetDeployments(world: World): void {
  world.set(RosterPlaced, { counts: {} });
}
