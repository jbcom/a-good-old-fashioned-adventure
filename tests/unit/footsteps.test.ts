import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { IsPlayer, MoveIntent, Outbox } from "../../src/sim/traits";

/**
 * Footstep cues ride travelled distance (src/sim/systems/movement.ts):
 * a walking player emits footstep-* on a stride cadence, surface picked
 * from the tile underfoot — knights clank in armor regardless of ground.
 */

function walkAndCollect(classId: string, ticks: number): string[] {
  const world = createGameWorld(3);
  instantiateMap(world, "map:village", { classId });
  const player = world.queryFirst(IsPlayer);
  const cues: string[] = [];
  for (let i = 0; i < ticks; i++) {
    player?.set(MoveIntent, { x: 1, y: 0 });
    step(world);
    const outbox = world.get(Outbox);
    if (outbox) {
      cues.push(...outbox.sfx.filter((s) => s.startsWith("footstep-")));
      outbox.sfx.length = 0;
    }
  }
  return cues;
}

describe("footsteps", () => {
  it("an armored knight clanks on a stride cadence while walking", () => {
    const cues = walkAndCollect("knight", 120);
    expect(cues.length).toBeGreaterThan(3);
    expect(new Set(cues)).toEqual(new Set(["footstep-armor"]));
  });

  it("an unarmored class steps by surface, and a still player is silent", () => {
    const cues = walkAndCollect("ranger", 120);
    expect(cues.length).toBeGreaterThan(3);
    for (const cue of cues) expect(cue).not.toBe("footstep-armor");

    const world = createGameWorld(3);
    instantiateMap(world, "map:village", { classId: "ranger" });
    for (let i = 0; i < 60; i++) step(world);
    const idle = world.get(Outbox)?.sfx.filter((s) => s.startsWith("footstep-")) ?? [];
    expect(idle).toEqual([]);
  });
});
