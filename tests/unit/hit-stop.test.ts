import { describe, expect, it } from "vitest";
import { combat } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnProjectile } from "../../src/sim/factories";
import { playerAttack } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import { Clock, FxBurst, HitStop, IsEnemy, IsPlayer, Transform } from "../../src/sim/traits";

function bootBesideOrc() {
  const world = createGameWorld(81);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  const player = world.queryFirst(IsPlayer);
  const orc = [...world.query(IsEnemy, Transform)].find(
    (entity) => entity.get(IsEnemy)?.archetypeId === "forest-orc",
  );
  if (!player || !orc) throw new Error("missing actors");
  const ot = orc.get(Transform);
  player.set(Transform, { x: (ot?.x ?? 0) - 12, y: ot?.y ?? 0 });
  return { world, player };
}

describe("S12.4 hit-stop and impact", () => {
  it("freezes the sim for a beat when a swing connects", () => {
    const { world } = bootBesideOrc();
    playerAttack(world);
    expect(world.get(HitStop)?.left).toBe(combat.feedback.hitStopDuration);

    const t0 = world.get(Clock)?.t ?? 0;
    step(world, combat.feedback.hitStopDuration / 2);
    expect(world.get(Clock)?.t).toBe(t0); // fully consumed by the stop

    step(world, combat.feedback.hitStopDuration);
    // half the stop remained: only the overflow advances the clock
    expect(world.get(Clock)?.t).toBeCloseTo(t0 + combat.feedback.hitStopDuration / 2, 5);
    expect(world.get(HitStop)?.left).toBe(0);
  });

  it("does not stop time on a whiffed swing", () => {
    const world = createGameWorld(82);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    playerAttack(world);
    expect(world.get(HitStop)?.left ?? 0).toBe(0);
  });

  it("sheds fading trail ghosts along a projectile's flight", () => {
    const world = createGameWorld(83);
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    spawnProjectile(world, {
      type: "shadowbolt",
      x: 300,
      y: 300,
      vx: 80,
      vy: 0,
      life: 1,
      fromPlayer: false,
    });

    step(world, 1 / 60);
    const trails = [...world.query(FxBurst)]
      .map((entity) => entity.get(FxBurst))
      .filter((fx) => fx?.kind === "trail");
    expect(trails.length).toBeGreaterThan(0);
    expect(trails[0]?.spriteId).toBe("sprite:proj-shadowbolt");
    expect(trails[0]?.total).toBe(combat.feedback.projectileTrailDuration);
  });
});
