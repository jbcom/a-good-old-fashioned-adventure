import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { currentWave, lineVitals } from "../../src/sim/systems/waves";
import { Health, IsUnit } from "../../src/sim/traits";

/**
 * S20.1 rail HUD: the HUD commands a LINE, not a hero. lineVitals aggregates
 * the whole fielded line's hp (sum over sum) and breaks it down per class for
 * the unit chips; currentWave reads the gate's wave counter. These back the
 * line-vitals bar, the wave chip, and the per-class unit chips.
 */
describe("line vitals (rail HUD aggregate)", () => {
  it("reports zero vitals with no line fielded", () => {
    const world = createGameWorld(5);
    instantiateMap(world, "map:rescue-route", { classId: "knight", withPlayer: false });
    const v = lineVitals(world);
    expect(v.count).toBe(0);
    expect(v.hp).toBe(0);
    expect(v.maxHp).toBe(0);
    expect(v.byClass).toEqual({});
  });

  it("sums hp over the whole line and breaks it down per class", () => {
    const world = createGameWorld(5);
    instantiateMap(world, "map:rescue-route", { classId: "knight", withPlayer: false });
    spawnUnit(world, "knight", 120, 950);
    spawnUnit(world, "knight", 150, 950);
    spawnUnit(world, "ranger", 110, 970);

    const v = lineVitals(world);
    expect(v.count).toBe(3);
    expect(v.byClass.knight.count).toBe(2);
    expect(v.byClass.ranger.count).toBe(1);
    // recompute directly from the fielded units as an independent check
    // (the map's authored boss also carries Health, so filter to IsUnit)
    let expectedHp = 0;
    let expectedMax = 0;
    for (const unit of world.query(IsUnit, Health)) {
      const h = unit.get(Health);
      if (!h) continue;
      expectedHp += Math.max(0, h.hp);
      expectedMax += h.maxHp;
    }
    expect(v.hp).toBe(expectedHp);
    expect(v.maxHp).toBe(expectedMax);
    expect(v.byClass.knight.maxHp + v.byClass.ranger.maxHp).toBe(v.maxHp);
  });

  it("reads the current wave number from the gate state", () => {
    const world = createGameWorld(5);
    instantiateMap(world, "map:rescue-route", { classId: "knight", withPlayer: false });
    // before any wave releases the counter is zero
    expect(currentWave(world)).toBe(0);
  });
});
