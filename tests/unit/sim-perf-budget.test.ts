import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnEnemy, spawnUnit } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { IsEnemy, IsUnit } from "../../src/sim/traits";

/**
 * S22.2 sim performance budget: a full field (a broad line + a dense wave) must
 * step well inside a 60fps frame (16.6ms) on the sim alone, leaving headroom
 * for render on a mid-tier phone. This is the DETERMINISTIC half of the budget
 * (the render draw-audit + heap stability are the browser/device half). We
 * measure the mean step cost over many frames with a worst-case field and assert
 * it stays a small fraction of the frame budget — a regression that makes the
 * sim itself blow the budget fails here, before it ever reaches a device.
 */
describe("S22.2 sim performance budget", () => {
  it("steps a full field well inside the 60fps frame budget", () => {
    const world = createGameWorld(7);
    instantiateMap(world, "map:oldwood-forest", { classId: "knight", withPlayer: false });

    // a broad line: every class fielded, several of each (a max-ish roster)
    const classes = [
      "knight",
      "ranger",
      "wizard",
      "rogue",
      "bard",
      "priest",
      "warlock",
      "barbarian",
    ];
    for (const cls of classes) {
      for (let i = 0; i < 3; i++) spawnUnit(world, cls, 120 + i * 24, 900 + i * 16);
    }
    // a dense wave: a wave-10-class crowd of trash
    for (let i = 0; i < 40; i++) {
      spawnEnemy(world, "forest-orc", 200 + (i % 8) * 22, 700 - Math.floor(i / 8) * 22);
    }

    const unitCount = [...world.query(IsUnit)].length;
    const enemyCount = [...world.query(IsEnemy)].length;
    expect(unitCount, "a broad line is fielded").toBeGreaterThanOrEqual(20);
    expect(enemyCount, "a dense wave is fielded").toBeGreaterThanOrEqual(40);

    // warm up (JIT), then measure
    for (let i = 0; i < 30; i++) step(world);
    const FRAMES = 120;
    const start = performance.now();
    for (let i = 0; i < FRAMES; i++) step(world);
    const meanMs = (performance.now() - start) / FRAMES;

    // the sim step must sit well under the 16.6ms frame budget — assert a
    // generous 8ms ceiling (half the frame) so render keeps the other half.
    // Mid-tier phones run ~2-4x slower than CI, so this CI headroom matters.
    expect(meanMs, `sim step ${meanMs.toFixed(2)}ms exceeds half the frame budget`).toBeLessThan(8);
  });
});
