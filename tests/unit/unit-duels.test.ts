import { describe, expect, it } from "vitest";
import { classes } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnEnemy, spawnUnit } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { Health, IsEnemy, IsPlayer, IsUnit, Transform } from "../../src/sim/traits";

/** Open-floor arena with no player pawn: the rail-command field. */
function arena(seed = 41) {
  const world = createGameWorld(seed);
  instantiateMap(world, "map:castle-dungeon", { classId: "knight" });
  for (const e of [...world.query(IsEnemy)]) e.destroy();
  world.queryFirst(IsPlayer)?.destroy();
  return world;
}

function runSeconds(world: ReturnType<typeof createGameWorld>, seconds: number) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) step(world, 1 / 60);
}

describe("S17.2 unit temperaments", () => {
  it("a knight charges the orc and cuts it down unaided", () => {
    const world = arena(41);
    const knight = spawnUnit(world, "knight", 120, 200);
    spawnEnemy(world, "forest-orc", 280, 200);

    const x0 = knight.get(Transform)?.x ?? 0;
    runSeconds(world, 1);
    // charging: visibly closed distance within the first second
    expect(knight.get(Transform)?.x ?? 0).toBeGreaterThan(x0 + 40);

    runSeconds(world, 7);
    expect([...world.query(IsEnemy)]).toHaveLength(0);
    expect(world.has(knight)).toBe(true);
  });

  it("a ranger holds its firing band and kills from range", () => {
    const world = arena(42);
    const ranger = spawnUnit(world, "ranger", 120, 200);
    const orc = spawnEnemy(world, "forest-orc", 320, 200);
    const keep = classes.classes.ranger.temperament?.keepDistance ?? 0;

    let minDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 60 * 12 && world.has(orc); i++) {
      step(world, 1 / 60);
      const rt = ranger.get(Transform);
      const ot = orc.get?.(Transform);
      if (rt && ot && world.has(orc)) {
        minDist = Math.min(minDist, Math.hypot(rt.x - ot.x, rt.y - ot.y));
      }
    }
    expect([...world.query(IsEnemy)]).toHaveLength(0);
    // the ranger never face-tanked: it kited around its keep distance
    expect(minDist).toBeGreaterThan(keep / 2);
  });

  it("enemies hunt the nearest unit when no player pawn exists", () => {
    const world = arena(43);
    spawnUnit(world, "ranger", 120, 200);
    const orc = spawnEnemy(world, "forest-orc", 190, 200);
    const x0 = orc.get(Transform)?.x ?? 0;
    runSeconds(world, 0.6);
    expect(orc.get(Transform)?.x ?? 0).toBeLessThan(x0);
  });

  it("a bard's marching meter heals the wounded line", () => {
    const world = arena(44);
    const knight = spawnUnit(world, "knight", 200, 200);
    spawnUnit(world, "bard", 220, 200);
    const hurt = (classes.classes.knight.temperament?.hp ?? 0) - 20;
    knight.set(Health, { hp: hurt, maxHp: classes.classes.knight.temperament?.hp ?? 0 });

    runSeconds(world, (classes.classes.bard.temperament?.pulsePeriod ?? 2) * 2 + 0.2);
    expect(knight.get(Health)?.hp ?? 0).toBeGreaterThan(hurt);
  });

  it("units fall to armed contact and the field can collapse", () => {
    const world = arena(45);
    // the bard neither fights nor flees: armed contact must wear it down
    const bard = spawnUnit(world, "bard", 200, 200);
    bard.set(Health, { hp: 10, maxHp: 10 });
    spawnEnemy(world, "forest-orc", 204, 200);
    runSeconds(world, 6);
    expect([...world.query(IsUnit)]).toHaveLength(0);
  });
});
