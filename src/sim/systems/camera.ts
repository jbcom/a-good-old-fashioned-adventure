/**
 * Camera follow (smooth lerp toward the player) + screen shake with
 * deterministic jitter from the world's RNG stream.
 */
import type { World } from "koota";
import { engine } from "../../lib/config";
import type { Rng } from "../rng";
import { CameraState, IsPlayer, Transform } from "../traits";

export function updateCamera(world: World, rng: Rng): void {
  const player = world.queryFirst(IsPlayer);
  const camera = world.get(CameraState);
  if (!player || !camera) return;
  const target = player.get(Transform);
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
