/**
 * NPC AI: content-authored walking loops interpreted through Yuka steering.
 * Patrol NPCs feed MoveIntent and use the same movement/collision pipeline as
 * every other mobile entity.
 */
import type { Entity, World } from "koota";
import { SeekBehavior, Vector3, Vehicle } from "yuka";
import { Facing, IsNpc, MoveIntent, NpcPatrol, Speed, Transform } from "../traits";

interface NpcAi {
  vehicle: Vehicle;
  seek: SeekBehavior;
}

const aiStates = new WeakMap<World, Map<Entity, NpcAi>>();

function aiFor(world: World, npc: Entity, x: number, y: number): NpcAi {
  let perWorld = aiStates.get(world);
  if (!perWorld) {
    perWorld = new Map();
    aiStates.set(world, perWorld);
  }
  let ai = perWorld.get(npc);
  if (!ai) {
    const vehicle = new Vehicle();
    vehicle.position.set(x, y, 0);
    const seek = new SeekBehavior(new Vector3());
    vehicle.steering.add(seek);
    ai = { vehicle, seek };
    perWorld.set(npc, ai);
  }
  return ai;
}

function pruneDead(world: World): void {
  const perWorld = aiStates.get(world);
  if (!perWorld) return;
  for (const entity of [...perWorld.keys()]) {
    if (!world.has(entity)) perWorld.delete(entity);
  }
}

export function npcAIStep(world: World, dt: number): void {
  pruneDead(world);
  for (const npc of [...world.query(IsNpc, NpcPatrol, Transform, Speed, MoveIntent)]) {
    const patrol = npc.get(NpcPatrol);
    const transform = npc.get(Transform);
    const speed = npc.get(Speed);
    if (!patrol || !transform || !speed || patrol.points.length < 2) continue;

    let targetIndex = patrol.targetIndex % patrol.points.length;
    let target = patrol.points[targetIndex];
    const distance = Math.hypot(target.x - transform.x, target.y - transform.y);
    if (distance < 3) {
      targetIndex = (targetIndex + 1) % patrol.points.length;
      target = patrol.points[targetIndex];
      npc.set(NpcPatrol, { ...patrol, targetIndex });
    }

    const ai = aiFor(world, npc, transform.x, transform.y);
    ai.vehicle.position.set(transform.x, transform.y, 0);
    ai.vehicle.velocity.set(0, 0, 0);
    ai.vehicle.maxSpeed = speed.value;
    ai.seek.target.set(target.x, target.y, 0);
    ai.seek.active = true;
    ai.vehicle.update(dt);

    const velocity = ai.vehicle.velocity;
    const len = Math.hypot(velocity.x, velocity.y);
    if (len < 1e-6) {
      npc.set(MoveIntent, { x: 0, y: 0 });
      continue;
    }
    const intentX = velocity.x / len;
    const intentY = velocity.y / len;
    npc.set(MoveIntent, { x: intentX, y: intentY });
    if (intentX !== 0) npc.set(Facing, { dir: intentX > 0 ? 1 : -1 });
  }
}
