import { describe, expect, it } from "vitest";
import { enemies } from "../../src/lib/config";
import { threatScale } from "../../src/render/pose";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { combatStep, damageEnemy } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import {
  Clock,
  Health,
  IsEnemy,
  IsPlayer,
  ShieldState,
  Threat,
  Transform,
} from "../../src/sim/traits";

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

  it("never arms a touchHarmless enemy: the wraith hurts only through bolts", () => {
    const world = createGameWorld(74);
    instantiateMap(world, "map:castle-library", { classId: "knight" });
    const player = world.queryFirst(IsPlayer);
    const shade = [...world.query(IsEnemy, Transform)].find(
      (entity) => entity.get(IsEnemy)?.archetypeId === "lectern-shade",
    );
    if (!player || !shade) throw new Error("missing actors");
    const st = shade.get(Transform);
    player.set(Transform, { x: st?.x ?? 0, y: st?.y ?? 0 });

    // standing inside the wraith through three full wind-ups: contact never
    // arms (touch damage requires armed — gated in combatStep), and the
    // wind-up clock never even starts
    for (let i = 0; i < 3; i++) {
      step(world, windup.duration + 0.05);
      expect(shade.get(Threat)?.armed).toBe(false);
      expect(shade.get(Threat)?.windupLeft).toBe(windup.duration);
    }
  });

  it("holds an anchored guardian on its post through repeated blows", () => {
    const world = createGameWorld(75);
    instantiateMap(world, "map:castle-library", { classId: "knight" });
    const shade = [...world.query(IsEnemy, Transform)].find(
      (entity) => entity.get(IsEnemy)?.archetypeId === "lectern-shade",
    );
    if (!shade) throw new Error("missing shade");
    const x0 = shade.get(Transform)?.x;
    // without knockbackImmune each hit slides the shade 10px — five blows
    // would carry it beyond sword reach and turn the duel unwinnable
    for (let i = 0; i < 5; i++) damageEnemy(world, shade, 1, 1);
    expect(shade.get(Transform)?.x).toBe(x0);
  });

  it("holds an anchored guardian against the shield deflect too", () => {
    const world = createGameWorld(76);
    instantiateMap(world, "map:castle-library", { classId: "knight" });
    const player = world.queryFirst(IsPlayer);
    const shade = [...world.query(IsEnemy, Transform)].find(
      (entity) => entity.get(IsEnemy)?.archetypeId === "lectern-shade",
    );
    if (!player || !shade) throw new Error("missing actors");
    const st = shade.get(Transform);
    player.set(Transform, { x: st?.x ?? 0, y: st?.y ?? 0 });
    player.set(ShieldState, { active: true });
    // force the armed state (a future knockbackImmune enemy may arm for
    // real) and run only the combat pass so enemyAI can't disarm it first
    shade.set(Threat, { windupLeft: 0, armed: true, casting: false });
    const x0 = shade.get(Transform)?.x;
    combatStep(world, 1 / 60);
    expect(shade.get(Transform)?.x).toBe(x0);
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
