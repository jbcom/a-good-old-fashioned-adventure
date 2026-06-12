import { describe, expect, it } from "vitest";
import { combat } from "../../src/lib/config";
import { getSprite } from "../../src/lib/content/registry";
import { iframeAlpha, spritePose } from "../../src/render/pose";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { damagePlayer, playerAttack } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import { Clock, IsPlayer, MoveIntent } from "../../src/sim/traits";

function bootKnight() {
  const world = createGameWorld(57);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("no player");
  return { world, player };
}

describe("S12 pose frames", () => {
  it("parses the hero pose frames from the pix sheet", () => {
    const hero = getSprite("sprite:hero");
    for (const pose of ["walk-0", "walk-1", "attack", "hurt"]) {
      const rows = hero.frames?.[pose];
      expect(rows, `sprite:hero needs ${pose}`).toBeDefined();
      expect(rows).toHaveLength(16);
      for (const row of rows ?? []) expect(row).toHaveLength(16);
    }
    // frames must actually differ from the base pose
    expect(hero.frames?.attack?.join("\n")).not.toBe(hero.rows.join("\n"));
    expect(hero.frames?.["walk-0"]?.join("\n")).not.toBe(hero.frames?.["walk-1"]?.join("\n"));
  });

  it("stands idle, then walks on the deterministic clock", () => {
    const { world, player } = bootKnight();
    expect(spritePose(world, player, "sprite:hero")).toBe("idle");

    player.set(MoveIntent, { x: 1, y: 0 });
    world.set(Clock, { t: 0, dt: 0 });
    expect(spritePose(world, player, "sprite:hero")).toBe("walk-0");
    world.set(Clock, { t: 1 / combat.feedback.walkFrameFps + 0.001, dt: 0 });
    expect(spritePose(world, player, "sprite:hero")).toBe("walk-1");
  });

  it("lunges through the attack pose window after a swing", () => {
    const { world, player } = bootKnight();
    playerAttack(world);
    expect(spritePose(world, player, "sprite:hero")).toBe("attack");

    step(world, combat.feedback.attackPoseDuration + 0.05);
    expect(spritePose(world, player, "sprite:hero")).not.toBe("attack");
  });

  it("recoils and blinks through iframes after taking a hit", () => {
    const { world, player } = bootKnight();
    damagePlayer(world, 10, 0.4);
    expect(spritePose(world, player, "sprite:hero")).toBe("hurt");

    world.set(Clock, { t: 0, dt: 0 });
    const alphaA = iframeAlpha(world, player);
    world.set(Clock, { t: 1 / combat.feedback.iframeBlinkHz + 0.001, dt: 0 });
    const alphaB = iframeAlpha(world, player);
    expect(alphaA).not.toBe(alphaB);
  });
});
