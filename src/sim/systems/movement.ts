/**
 * Movement: applies MoveIntent (normalized direction) to every mobile
 * entity with axis-separated tile collision, class-ability speed
 * modifiers, facing updates, and world-bounds clamping.
 */
import type { World } from "koota";
import { classes, engine } from "../../lib/config";
import { collides } from "../collision";
import {
  AimDirection,
  CombatTimers,
  Facing,
  Footsteps,
  Hitbox,
  IsPlayer,
  MapRuntime,
  MoveIntent,
  Outbox,
  ShieldState,
  Speed,
  Transform,
} from "../traits";

const TILE = 16;
/** distance between footstep cues, tuned to the walk cycle */
const FOOTSTEP_STRIDE = 14;

/** Tile id → footstep surface (audio/sfx/footstep-<surface>.mp3). */
function footstepSurface(tileId: string): string {
  if (tileId.includes("water") || tileId.includes("river")) return "water";
  if (tileId.includes("sand") || tileId.includes("dune")) return "sand";
  if (tileId.includes("wood") || tileId.includes("floor") || tileId.includes("plank"))
    return "wood";
  if (tileId.includes("grass") || tileId.includes("moss") || tileId.includes("leaf"))
    return "grass";
  return "stone";
}

/** Per-tick: integrate velocity into position for all moving entities. */
export function moveEntities(world: World, dt: number): void {
  const runtime = world.get(MapRuntime);
  if (!runtime || runtime.mapId === "") return;
  const boundsW = runtime.cols * TILE;
  const boundsH = runtime.rows * TILE;
  const { edgeX, edgeTop, edgeBottom } = engine.playerBounds;

  for (const entity of world.query(Transform, MoveIntent, Speed, Hitbox)) {
    const intent = entity.get(MoveIntent);
    const transform = entity.get(Transform);
    const hitbox = entity.get(Hitbox);
    const speedTrait = entity.get(Speed);
    if (!intent || !transform || !hitbox || !speedTrait) continue;

    let speed = speedTrait.value;
    const playerTag = entity.get(IsPlayer);
    if (playerTag) {
      const ability = classes.classes[playerTag.classId]?.ability;
      if (entity.get(ShieldState)?.active && ability?.moveSpeedMultiplier) {
        speed *= ability.moveSpeedMultiplier;
      }
      const timers = entity.get(CombatTimers);
      if (timers && timers.dash > 0 && ability?.dashSpeedMultiplier) {
        speed *= ability.dashSpeedMultiplier;
      }
    }

    let { x: ix, y: iy } = intent;
    const len = Math.hypot(ix, iy);
    if (len === 0) continue;
    ix = (ix / len) * speed * dt;
    iy = (iy / len) * speed * dt;

    let { x, y } = transform;
    if (ix !== 0) {
      x += ix;
      if (collides(world, x, y, hitbox.w, hitbox.h)) x -= ix;
    }
    if (iy !== 0) {
      y += iy;
      if (collides(world, x, y, hitbox.w, hitbox.h)) y -= iy;
    }

    if (playerTag) {
      x = Math.max(edgeX, Math.min(boundsW - edgeX, x));
      y = Math.max(edgeTop, Math.min(boundsH - edgeBottom, y));
    }

    const moved = Math.hypot(x - transform.x, y - transform.y);
    entity.set(Transform, { x, y });
    if (playerTag) entity.set(AimDirection, { x: ix, y: iy });
    if (ix > 0) entity.set(Facing, { dir: 1 });
    else if (ix < 0) entity.set(Facing, { dir: -1 });

    // footstep cues ride travelled distance so cadence tracks real motion,
    // not intent — a wall-blocked player goes quiet
    const steps = playerTag ? entity.get(Footsteps) : undefined;
    if (playerTag && steps && moved > 0) {
      const travelled = steps.travelled + moved;
      if (travelled >= FOOTSTEP_STRIDE) {
        const col = Math.max(0, Math.min(runtime.cols - 1, Math.floor(x / TILE)));
        const row = Math.max(0, Math.min(runtime.rows - 1, Math.floor(y / TILE)));
        // armored classes clank regardless of ground
        const cue =
          playerTag.classId === "knight"
            ? "footstep-armor"
            : `footstep-${footstepSurface(runtime.grid[row][col])}`;
        world.get(Outbox)?.sfx.push(cue);
        entity.set(Footsteps, { travelled: travelled % FOOTSTEP_STRIDE });
      } else {
        entity.set(Footsteps, { travelled });
      }
    }
  }
}
