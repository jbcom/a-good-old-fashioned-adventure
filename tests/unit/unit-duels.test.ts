import { describe, expect, it } from "vitest";
import { classes } from "../../src/lib/config";
import { createGameWorld, instantiateMap, spawnEnemy, spawnUnit } from "../../src/sim/factories";
import { damageEnemy } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import {
  Health,
  IsEnemy,
  IsPlayer,
  IsUnit,
  Projectile,
  Transform,
  Withered,
} from "../../src/sim/traits";

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

describe("S18.3 tier verbs", () => {
  it("the warlock's field withers: slowed stride, softened body", () => {
    const world = arena(46);
    spawnUnit(world, "warlock", 200, 200);
    const orc = spawnEnemy(world, "forest-orc", 230, 200);
    runSeconds(world, 0.5);
    expect(orc.get(Withered)?.left ?? 0).toBeGreaterThan(0);

    // softened: the same blow lands harder on the withered
    const fresh = spawnEnemy(world, "forest-orc", 600, 600);
    const hpW0 = orc.get(Health)?.hp ?? 0;
    const hpF0 = fresh.get(Health)?.hp ?? 0;
    damageEnemy(world, orc, 10, 1);
    damageEnemy(world, fresh, 10, 1);
    const witheredLoss = hpW0 - (orc.get(Health)?.hp ?? 0);
    const freshLoss = hpF0 - (fresh.get(Health)?.hp ?? 0);
    expect(witheredLoss).toBeGreaterThan(freshLoss);
  });

  it("the priest channels the wounded back to their feet", () => {
    const world = arena(47);
    const knight = spawnUnit(world, "knight", 210, 200);
    spawnUnit(world, "priest", 230, 200);
    const max = classes.classes.knight.temperament?.hp ?? 0;
    knight.set(Health, { hp: max - 25, maxHp: max });
    runSeconds(world, 4);
    expect(knight.get(Health)?.hp ?? 0).toBeGreaterThan(max - 25);
  });

  it("the dread knight's blows carry the wither", () => {
    const world = arena(48);
    spawnUnit(world, "dread-knight", 180, 200);
    const orc = spawnEnemy(world, "forest-orc", 230, 200);
    let withered = false;
    for (let i = 0; i < 60 * 4 && world.has(orc); i++) {
      step(world, 1 / 60);
      if ((orc.get(Withered)?.left ?? 0) > 0) {
        withered = true;
        break;
      }
    }
    expect(withered).toBe(true);
  });

  it("the stormcaller's whirl looses bolts at the whole pack", () => {
    const world = arena(49);
    spawnUnit(world, "stormcaller", 200, 200);
    spawnEnemy(world, "forest-orc", 260, 190);
    spawnEnemy(world, "forest-orc", 250, 220);
    spawnEnemy(world, "forest-orc", 270, 205);
    let maxBolts = 0;
    for (let i = 0; i < 60 * 2; i++) {
      step(world, 1 / 60);
      maxBolts = Math.max(maxBolts, [...world.query(Projectile)].length);
    }
    expect(maxBolts).toBeGreaterThanOrEqual(3);
  });

  it("the barbarian's storm strikes everything in the whirl", () => {
    const world = arena(50);
    spawnUnit(world, "barbarian", 200, 200);
    const a = spawnEnemy(world, "forest-orc", 240, 195);
    const b = spawnEnemy(world, "forest-orc", 245, 210);
    runSeconds(world, 3);
    const aHurt = !world.has(a) || (a.get(Health)?.hp ?? 99) < 20;
    const bHurt = !world.has(b) || (b.get(Health)?.hp ?? 99) < 20;
    expect(aHurt && bHurt).toBe(true);
  });
});
