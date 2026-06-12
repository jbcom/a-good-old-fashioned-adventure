import { describe, expect, it } from "vitest";
import { combat, enemies } from "../../src/lib/config";
import { threatScale } from "../../src/render/pose";
import { createGameWorld, instantiateMap, spawnEnemy } from "../../src/sim/factories";
import { damageEnemy } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import { Choreo, Health, IsEnemy, IsPlayer, Projectile, Transform } from "../../src/sim/traits";

const dragonPhases = enemies.archetypes["dragon-guardian"].boss?.phases;
const knightStance = enemies.archetypes["banner-knight"].guard?.stance;
if (!dragonPhases || !knightStance) throw new Error("choreography config missing");

function bootWith(archetypeId: string, offsetX: number) {
  const world = createGameWorld(91);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("no player");
  // clear the stock cast so phase reads are unambiguous
  for (const e of [...world.query(IsEnemy)]) e.destroy();
  const pt = player.get(Transform);
  const boss = spawnEnemy(world, archetypeId, (pt?.x ?? 0) + offsetX, pt?.y ?? 0);
  return { world, player, boss };
}

describe("S12.5 dragon-guardian phases", () => {
  it("cycles roar -> volley -> lull -> roar on config timers", () => {
    const { world, boss } = bootWith("dragon-guardian", 60);
    expect(boss.get(Choreo)?.phase).toBe("roar");

    step(world, dragonPhases.roar + 0.01);
    expect(boss.get(Choreo)?.phase).toBe("volley");

    step(world, dragonPhases.volley + 0.01);
    expect(boss.get(Choreo)?.phase).toBe("lull");

    step(world, dragonPhases.lull + 0.01);
    expect(boss.get(Choreo)?.phase).toBe("roar");
  });

  it("fires the spread exactly once, on entering the volley", () => {
    const { world } = bootWith("dragon-guardian", 60);
    const spread = enemies.archetypes["dragon-guardian"].boss?.spreadAngles.length ?? 0;

    step(world, dragonPhases.roar / 2);
    expect([...world.query(Projectile)]).toHaveLength(0);

    step(world, dragonPhases.roar / 2 + 0.02);
    expect([...world.query(Projectile)]).toHaveLength(spread);

    // the rest of the volley phase adds no further shots
    step(world, dragonPhases.volley - 0.05);
    expect([...world.query(Projectile)].length).toBeLessThanOrEqual(spread);
  });

  it("holds still through roar and lull, advances through the volley", () => {
    const { world, boss } = bootWith("dragon-guardian", 60);
    const xAtRoar = boss.get(Transform)?.x ?? 0;
    step(world, dragonPhases.roar - 0.05);
    expect(boss.get(Transform)?.x).toBe(xAtRoar);

    step(world, 0.1); // into the volley
    const xAtVolley = boss.get(Transform)?.x ?? 0;
    step(world, dragonPhases.volley / 2);
    expect(boss.get(Transform)?.x).not.toBe(xAtVolley);
  });

  it("is armored outside the lull and vulnerable inside it", () => {
    const { world, boss } = bootWith("dragon-guardian", 60);
    const hp0 = boss.get(Health)?.hp ?? 0;
    damageEnemy(world, boss, 10, 1); // roar phase
    expect(boss.get(Health)?.hp).toBe(hp0 - 10 * dragonPhases.armorMultiplier);

    boss.set(Choreo, { phase: "lull", left: dragonPhases.lull });
    const hp1 = boss.get(Health)?.hp ?? 0;
    damageEnemy(world, boss, 10, 1);
    expect(boss.get(Health)?.hp).toBe(hp1 - 10);
  });

  it("pauses the phase clock outside aggro range", () => {
    const { world, player, boss } = bootWith("dragon-guardian", 60);
    const aggro = enemies.archetypes["dragon-guardian"].boss?.aggroRange ?? 0;
    const bt = boss.get(Transform);
    player.set(Transform, { x: (bt?.x ?? 0) + aggro + 80, y: bt?.y ?? 0 });
    const before = boss.get(Choreo);
    step(world, dragonPhases.roar + 0.5);
    expect(boss.get(Choreo)).toEqual(before);
  });
});

describe("S12.5 banner-knight guard stance", () => {
  it("cycles guard <-> open while aggroed and reduces damage while guarding", () => {
    const { world, boss } = bootWith("banner-knight", 30);
    step(world, 0.05);
    expect(boss.get(Choreo)?.phase).toBe("guard");

    const hp0 = boss.get(Health)?.hp ?? 0;
    damageEnemy(world, boss, 10, 1);
    expect(boss.get(Health)?.hp).toBe(hp0 - 10 * knightStance.damageMultiplier);

    step(world, knightStance.guard + 0.05);
    expect(boss.get(Choreo)?.phase).toBe("open");
    const hp1 = boss.get(Health)?.hp ?? 0;
    damageEnemy(world, boss, 10, 1);
    expect(boss.get(Health)?.hp).toBe(hp1 - 10);

    step(world, knightStance.open + 0.05);
    expect(boss.get(Choreo)?.phase).toBe("guard");
  });

  it("drops the stance when the player leaves the fight", () => {
    const { world, player, boss } = bootWith("banner-knight", 30);
    step(world, 0.05);
    expect(boss.get(Choreo)?.phase).toBe("guard");

    const spec = enemies.archetypes["banner-knight"].guard;
    const bt = boss.get(Transform);
    player.set(Transform, {
      x: (bt?.x ?? 0) + (spec?.deaggroRange ?? 0) + 60,
      y: bt?.y ?? 0,
    });
    step(world, 0.05);
    expect(boss.get(Choreo)?.phase).toBe("");
  });
});

describe("S12.5 choreography is visible", () => {
  it("throbs heavy through the roar and crouches through the guard", () => {
    const { world, boss } = bootWith("dragon-guardian", 60);
    expect(boss.get(Choreo)?.phase).toBe("roar");
    // sample across a throb period: the roar must visibly swell past idle
    let max = 1;
    for (let i = 0; i < 8; i++) {
      step(world, 1 / 60);
      max = Math.max(max, threatScale(world, boss));
    }
    expect(max).toBeGreaterThan(1 + combat.feedback.roarThrobScale / 4);

    boss.set(Choreo, { phase: "guard", left: 1 });
    expect(threatScale(world, boss)).toBe(combat.feedback.guardCrouchScale);
  });
});
