import { describe, expect, it } from "vitest";
import { emitDialogueSeen, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { sanitizeIncrementalProgress } from "../../src/sim/incrementalProgress";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import {
  IncrementalProgress,
  IsEnemy,
  IsNpc,
  Outbox,
  PropRef,
  QuestLog,
} from "../../src/sim/traits";

function bootWorld(mapId: string, castleUnlocked: boolean) {
  const world = createGameWorld(248);
  if (castleUnlocked) {
    world.set(
      IncrementalProgress,
      sanitizeIncrementalProgress({
        purchasedUpgradeIds: ["upgrade:first-vow"],
        unlockedRoutePackIds: ["castle-interior"],
      }),
    );
  }
  autoStartQuests(world);
  instantiateMap(world, mapId, { classId: "knight" });
  pushEvent(world, { type: "map:entered", mapId });
  step(world, 0);
  return world;
}

function enemyIds(world: ReturnType<typeof createGameWorld>): string[] {
  return [...world.query(IsEnemy)].map((entity) => entity.get(IsEnemy)?.archetypeId ?? "");
}

function npcIds(world: ReturnType<typeof createGameWorld>): string[] {
  return [...world.query(IsNpc)].map((entity) => entity.get(IsNpc)?.charId ?? "");
}

function propIds(world: ReturnType<typeof createGameWorld>): string[] {
  return [...world.query(PropRef)].map((entity) => entity.get(PropRef)?.propId ?? "");
}

describe("S9.9 the princess is in another castle", () => {
  it("keeps the baseline summit rescue until the castle opens", () => {
    const world = bootWorld("map:rescue-route", false);
    expect(enemyIds(world)).toContain("dragon-guardian");
    expect(npcIds(world)).toContain("char:princess-amber");
    expect(enemyIds(world)).not.toContain("banner-knight");
    expect(propIds(world)).not.toContain("prop:castle-gatehouse");
  });

  it("relocates princess and dragon behind the gate once the castle opens", () => {
    const route = bootWorld("map:rescue-route", true);
    expect(enemyIds(route)).not.toContain("dragon-guardian");
    expect(npcIds(route)).not.toContain("char:princess-amber");
    expect(enemyIds(route)).toContain("banner-knight");
    expect(propIds(route)).toContain("prop:castle-gatehouse");

    const hall = bootWorld("map:castle-hall", true);
    expect(enemyIds(hall)).toContain("dragon-guardian");
    expect(npcIds(hall)).toContain("char:princess-amber");
  });

  it("leaves the library-journey hall untouched without the unlock", () => {
    const hall = bootWorld("map:castle-hall", false);
    expect(enemyIds(hall)).not.toContain("dragon-guardian");
    expect(npcIds(hall)).not.toContain("char:princess-amber");
  });

  it("completes the relocated rescue inside the candlelit hall", () => {
    const world = bootWorld("map:rescue-route", true);
    expect(world.get(QuestLog)?.active["quest:rescue-run"]?.stage).toBe("fell-the-dragon");

    // walk through the gate: same run, new venue
    instantiateMap(world, "map:castle-hall", { classId: "knight", spawnId: "rescue-gate" });
    pushEvent(world, { type: "map:entered", mapId: "map:castle-hall" });
    step(world, 0);

    pushEvent(world, { type: "enemy:defeated", archetypeId: "dragon-guardian", x: 732, y: 268 });
    step(world, 0);
    expect(world.get(QuestLog)?.active["quest:rescue-run"]?.stage).toBe("reach-princess");

    const dialogue = resolveDialogue(world, "dlgbank:princess-amber");
    expect(dialogue.nodeKey).toBe("freed");
    emitDialogueSeen(world, dialogue.node);
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:rescue-run");
    expect(world.get(Outbox)?.endGame).toBe("victory");
    expect(world.get(IncrementalProgress)?.rescueCount).toBe(1);
  });
});
