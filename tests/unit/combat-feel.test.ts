import { describe, expect, it } from "vitest";
import { combat } from "../../src/lib/config";
import { getSprite } from "../../src/lib/content/registry";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { damageEnemy, playerAttack } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import { FxBurst, FxStats, Health, IsEnemy, SpriteRef } from "../../src/sim/traits";

function bootRoute() {
  const world = createGameWorld(31);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  return world;
}

describe("S9.16 combat and motion feel", () => {
  it("spawns a mirrored swing streak on every melee attack", () => {
    const world = bootRoute();
    playerAttack(world);

    const bursts = [...world.query(FxBurst)];
    expect(bursts).toHaveLength(1);
    const fx = bursts[0].get(FxBurst);
    expect(fx?.kind).toBe("swing");
    expect(fx?.total).toBe(combat.feedback.swingFxDuration);
    expect(getSprite(fx?.spriteId ?? "").rows.length).toBeGreaterThan(0);
    expect(world.get(FxStats)?.spawned).toBe(1);

    step(world, combat.feedback.swingFxDuration + 0.05);
    expect([...world.query(FxBurst)]).toHaveLength(0);
  });

  it("dissolves a slain enemy as a fading silhouette of its own sprite", () => {
    const world = bootRoute();
    const enemy = [...world.query(IsEnemy, Health, SpriteRef)][0];
    expect(enemy).toBeTruthy();
    const spriteId = enemy.get(SpriteRef)?.spriteId ?? "";

    damageEnemy(world, enemy, 9999, 1);

    const dissolve = [...world.query(FxBurst)]
      .map((entity) => entity.get(FxBurst))
      .find((fx) => fx?.kind === "dissolve");
    expect(dissolve).toBeTruthy();
    expect(dissolve?.spriteId).toBe(spriteId);
    expect(dissolve?.total).toBe(combat.feedback.dissolveFxDuration);

    step(world, combat.feedback.dissolveFxDuration + 0.05);
    expect([...world.query(FxBurst)]).toHaveLength(0);
  });
});
