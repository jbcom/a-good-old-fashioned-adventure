import { describe, expect, it } from "vitest";
import { enemies } from "../../src/lib/config";
import { threatScale } from "../../src/render/pose";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { Clock, Health, IsEnemy, IsPlayer, Threat, Transform } from "../../src/sim/traits";

const windup = enemies.aiDefaults.windup;

function bootBesideOrc() {
  const world = createGameWorld(73);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  const player = world.queryFirst(IsPlayer);
  const orc = [...world.query(IsEnemy, Transform)].find(
    (entity) => entity.get(IsEnemy)?.archetypeId === "forest-orc",
  );
  if (!player || !orc) throw new Error("missing actors");
  const ot = orc.get(Transform);
  player.set(Transform, { x: ot?.x ?? 0, y: ot?.y ?? 0 });
  return { world, player, orc };
}

describe("S12.3 enemy telegraphs", () => {
  it("holds touch damage until the wind-up completes", () => {
    const { world, player, orc } = bootBesideOrc();
    const hp0 = player.get(Health)?.hp ?? 0;

    // inside the wind-up window: visibly threatening, not yet damaging
    step(world, windup.duration / 2);
    expect(orc.get(Threat)?.armed).toBe(false);
    expect(player.get(Health)?.hp).toBe(hp0);

    // wind-up complete: armed, and contact now hurts
    step(world, windup.duration / 2 + 0.05);
    expect(orc.get(Threat)?.armed).toBe(true);
    step(world, 0.05);
    expect(player.get(Health)?.hp ?? 0).toBeLessThan(hp0);
  });

  it("disarms and rewinds when the player breaks away", () => {
    const { world, player, orc } = bootBesideOrc();
    step(world, windup.duration + 0.1);
    expect(orc.get(Threat)?.armed).toBe(true);

    const ot = orc.get(Transform);
    player.set(Transform, { x: (ot?.x ?? 0) + windup.disarmRange + 40, y: ot?.y ?? 0 });
    step(world, 0.1);
    expect(orc.get(Threat)?.armed).toBe(false);
    expect(orc.get(Threat)?.windupLeft).toBe(windup.duration);
  });

  it("swells the telegraph pulse while winding and stays calm otherwise", () => {
    const { world, orc } = bootBesideOrc();
    world.set(Clock, { t: 0.0625, dt: 0 }); // sin(1.5) > 0 — mid-throb
    orc.set(Threat, { windupLeft: windup.duration / 2, armed: false, casting: false });
    expect(threatScale(world, orc)).toBeGreaterThan(1);

    orc.set(Threat, { windupLeft: windup.duration, armed: false, casting: false });
    expect(threatScale(world, orc)).toBe(1);

    orc.set(Threat, { windupLeft: 0, armed: true, casting: false });
    expect(threatScale(world, orc)).toBe(1);
  });

  it("flickers casters through the pre-shot beat", () => {
    const { world, orc } = bootBesideOrc();
    orc.set(Threat, { windupLeft: 0, armed: true, casting: true });
    world.set(Clock, { t: 0, dt: 0 });
    const a = threatScale(world, orc);
    world.set(Clock, { t: 1 / 14 + 0.001, dt: 0 });
    const b = threatScale(world, orc);
    expect(a).not.toBe(b);
    expect(Math.max(a, b)).toBeGreaterThan(1);
  });
});
