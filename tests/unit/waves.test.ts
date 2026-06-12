import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnUnit } from "../../src/sim/factories";
import { waveSize } from "../../src/sim/systems/waves";
import { step } from "../../src/sim/tick";
import {
  Health,
  IncrementalProgress,
  IsEnemy,
  IsPlayer,
  IsUnit,
  Outbox,
  WaveSpawned,
  WaveState,
} from "../../src/sim/traits";

function field(seed = 51) {
  const world = createGameWorld(seed);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  // rail-command field: no player pawn, no authored cast in the way
  world.queryFirst(IsPlayer)?.destroy();
  for (const e of [...world.query(IsEnemy)]) e.destroy();
  return world;
}

const waveCount = (world: ReturnType<typeof createGameWorld>) =>
  [...world.query(WaveSpawned)].length;

describe("S17.3 waves", () => {
  it("holds fire until the first unit lands, then releases wave one: a single mob", () => {
    const world = field(51);
    for (let i = 0; i < 30; i++) step(world, 1 / 60);
    expect(waveCount(world)).toBe(0);
    expect(world.get(WaveState)?.engaged).toBe(false);

    spawnUnit(world, "knight", 150, 940);
    step(world, 1 / 60);
    expect(world.get(WaveState)?.engaged).toBe(true);
    expect(world.get(WaveState)?.wave).toBe(1);
    expect(waveCount(world)).toBe(1);
  });

  it("releases the next wave only when the previous one is dead", () => {
    const world = field(52);
    spawnUnit(world, "knight", 150, 940);
    step(world, 1 / 60);
    expect(world.get(WaveState)?.wave).toBe(1);

    step(world, 1 / 60);
    expect(world.get(WaveState)?.wave).toBe(1); // wave 1 still alive

    for (const e of [...world.query(WaveSpawned)]) e.destroy();
    step(world, 1 / 60);
    expect(world.get(WaveState)?.wave).toBe(2);
    expect(waveCount(world)).toBe(waveSize(2, 0));
  });

  it("scales wave size with the wave number and the adversarial warband ranks", () => {
    expect(waveSize(1, 0)).toBe(1);
    expect(waveSize(3, 0)).toBe(2);
    expect(waveSize(5, 0)).toBe(3);
    expect(waveSize(1, 2)).toBe(3); // bought danger pays in wave size too

    const world = field(53);
    const progress = world.get(IncrementalProgress);
    if (!progress) throw new Error("no progress");
    world.set(IncrementalProgress, {
      ...progress,
      upgradeRanks: { "upgrade:orc-warband": 2 },
    });
    spawnUnit(world, "knight", 150, 940);
    step(world, 1 / 60);
    expect(waveCount(world)).toBe(waveSize(1, 2));
  });

  it("collapses the run through death-pays-out when the line falls", () => {
    const world = field(54);
    const bard = spawnUnit(world, "bard", 150, 940);
    bard.set(Health, { hp: 1, maxHp: 1 });
    step(world, 1 / 60); // engage + wave 1
    bard.destroy();
    step(world, 1 / 60);
    expect(world.get(Outbox)?.endGame).toBe("gameover");
    expect(world.get(IncrementalProgress)?.lastRun?.result).toBe("gameover");
    expect([...world.query(IsUnit)]).toHaveLength(0);
  });

  it("never waves bosses: gates draw only from the region's trash", () => {
    const world = field(55);
    spawnUnit(world, "knight", 150, 940);
    for (let i = 0; i < 20; i++) {
      for (const e of [...world.query(WaveSpawned)]) e.destroy();
      step(world, 1 / 60);
    }
    // many waves in: nothing spawned was ever a miniboss or boss
    expect(world.get(WaveState)?.wave).toBeGreaterThan(5);
  });
});
