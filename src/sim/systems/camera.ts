/**
 * Camera follow (smooth lerp toward the player) + screen shake with
 * deterministic jitter from the world's RNG stream.
 */
import type { World } from "koota";
import { engine } from "../../lib/config";
import type { Rng } from "../rng";
import { CameraState, IsPlayer, Transform } from "../traits";
import { frontline } from "./waves";

/** Per-tick: track the camera to the advancing front line. */
export function updateCamera(world: World, rng: Rng): void {
  const camera = world.get(CameraState);
  if (!camera) return;
  // rail command: with no player pawn the camera follows the front line
  const target = world.queryFirst(IsPlayer)?.get(Transform) ?? frontline(world);
  if (!target) return;

  let { x, y, shake } = camera;
  x += (target.x - x) * engine.camera.followLerp;
  y += (target.y - y) * engine.camera.followLerp;
  if (shake > 0.01) {
    x += (rng.next() - 0.5) * shake;
    y += (rng.next() - 0.5) * shake;
    shake *= engine.camera.shakeDecay;
  } else {
    shake = 0;
  }
  world.set(CameraState, { x, y, shake });
}
