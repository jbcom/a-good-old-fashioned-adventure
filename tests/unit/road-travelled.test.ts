import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { getMap } from "../../src/lib/content/registry";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { applyIncrementalEventReward, recordDeathPayout } from "../../src/sim/incrementalProgress";
import { IncrementalProgress } from "../../src/sim/traits";

const perSegment = incremental.runRewards.roadTravelled.perSegment ?? 0;

function boot() {
  const world = createGameWorld(31);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  return world;
}

function cross(world: ReturnType<typeof createGameWorld>, triggerId: string) {
  applyIncrementalEventReward(world, {
    type: "zone:entered",
    mapId: "map:rescue-route",
    triggerId,
  });
}

describe("S15.1 travel pays", () => {
  it("authors road waypoints along the rescue route", () => {
    const map = getMap("map:rescue-route");
    const waypoints = (map.triggers ?? []).filter((t) => t.kind === "road-waypoint");
    expect(waypoints.length).toBeGreaterThanOrEqual(3);
    expect(perSegment).toBeGreaterThan(0);
  });

  it("pays each segment once per run and remembers the crossing", () => {
    const world = boot();
    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;
    const c0 = coins();

    cross(world, "trigger:road-south-bend");
    expect(coins()).toBe(c0 + perSegment);
    expect(world.get(IncrementalProgress)?.currentRunRoadIds).toContain(
      "map:rescue-route:trigger:road-south-bend",
    );

    cross(world, "trigger:road-south-bend");
    expect(coins()).toBe(c0 + perSegment); // second crossing pays nothing

    cross(world, "trigger:road-east-jog");
    expect(coins()).toBe(c0 + perSegment * 2);
  });

  it("ignores zones that are not road waypoints", () => {
    const world = boot();
    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;
    const c0 = coins();
    cross(world, "trigger:does-not-exist");
    expect(coins()).toBe(c0);
  });

  it("resets crossings when the run closes, so the next run pays again", () => {
    const world = boot();
    cross(world, "trigger:road-south-bend");
    const closed = recordDeathPayout(world);
    expect(closed.currentRunRoadIds).toEqual([]);

    const coins = () => world.get(IncrementalProgress)?.coins ?? 0;
    const c1 = coins();
    cross(world, "trigger:road-south-bend");
    expect(coins()).toBe(c1 + perSegment);
  });
});

describe("S15.1 rot-guard: every configured reward has a grant path", () => {
  it("finds a grant site for every runRewards key", () => {
    // configured income nothing grants is a dead promise — the recurring
    // rot this arc keeps finding (orc-warband, roadTravelled). Grants live
    // either in sim code (string literal or special-cased key) or in quest
    // effects ({ "grantRunReward": "<key>" }).
    const simSource = readdirSync(resolve(process.cwd(), "src/sim"), { recursive: true })
      .map(String)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(resolve(process.cwd(), "src/sim", file), "utf8"))
      .join("\n");
    const questSource = readdirSync(resolve(process.cwd(), "src/content/story/quests"))
      .filter((file) => file.endsWith(".json"))
      .map((file) => readFileSync(resolve(process.cwd(), "src/content/story/quests", file), "utf8"))
      .join("\n");
    for (const key of Object.keys(incremental.runRewards)) {
      // sim grants appear quoted ("enemyDefeated") or as property access
      // (runRewards.roadTravelled); quest grants are always quoted JSON
      const granted = simSource.includes(key) || questSource.includes(`"${key}"`);
      expect(granted, `runRewards.${key} is configured but never granted`).toBe(true);
    }
  });
});
