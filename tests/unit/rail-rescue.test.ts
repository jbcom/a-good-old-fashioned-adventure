import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { damageEnemy } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import {
  Choreo,
  IncrementalProgress,
  IsEnemy,
  IsNpc,
  IsPlayer,
  Outbox,
  Transform,
  WaveState,
} from "../../src/sim/traits";

/**
 * Rail-mode endgame (docs/RAIL-COMMAND.md §Endgame): the front reaching a
 * dead boss's princess frees her without a pawn — the quest engine pays
 * the rose and ends the run in victory through the same freed event a
 * spoken dialogue would emit.
 */

function bootRail() {
  const world = createGameWorld(7);
  autoStartQuests(world);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  pushEvent(world, { type: "map:entered", mapId: "map:rescue-route" });
  step(world, 0);
  // rail mode: no pawn commands the field
  world.queryFirst(IsPlayer)?.destroy();
  const unit = spawnUnit(world, "knight", 96, 400);
  world.set(WaveState, { wave: 1, engaged: true });
  return { world, unit };
}

function princessPos(world: ReturnType<typeof createGameWorld>) {
  for (const npc of world.query(IsNpc, Transform)) {
    if (npc.get(IsNpc)?.charId === "char:princess-amber") return npc.get(Transform);
  }
  return undefined;
}

describe("rail-mode rescue", () => {
  it("boss dead + front at the princess → rose and victory, no pawn involved", () => {
    const { world, unit } = bootRail();
    const princess = princessPos(world);
    expect(princess).toBeDefined();

    // the boss still stands: standing at the princess must NOT free her
    unit.set(Transform, { x: princess?.x ?? 0, y: (princess?.y ?? 0) + 8 });
    step(world);
    expect(world.get(Outbox)?.endGame).toBeNull();

    // fell the choreographed boss through the real damage path
    for (const enemy of [...world.query(IsEnemy, Choreo)]) {
      enemy.set(Choreo, { phase: "lull", left: 99 }); // vulnerable
      damageEnemy(world, enemy, 9999, 1);
    }
    expect(world.queryFirst(IsEnemy, Choreo)).toBeUndefined();

    const rosesBefore = world.get(IncrementalProgress)?.roses ?? 0;
    // step twice: the kill event advances the quest stage on the first
    // tick; the freed proximity event lands on the second
    step(world);
    step(world);
    expect(world.get(Outbox)?.endGame).toBe("victory");
    expect(world.get(IncrementalProgress)?.roses ?? 0).toBeGreaterThan(rosesBefore);
  });

  it("the front standing short of rescueRadius does not free her", () => {
    const { world, unit } = bootRail();
    for (const enemy of [...world.query(IsEnemy, Choreo)]) {
      enemy.set(Choreo, { phase: "lull", left: 99 });
      damageEnemy(world, enemy, 9999, 1);
    }
    const princess = princessPos(world);
    unit.set(Transform, {
      x: princess?.x ?? 0,
      y: (princess?.y ?? 0) + incremental.loop.rescueRadius + 24,
    });
    step(world);
    expect(world.get(Outbox)?.endGame).toBeNull();
  });
});
