import { describe, expect, it } from "vitest";
import { incremental } from "../../src/lib/config";
import { getMap, getQuest } from "../../src/lib/content/registry";
import { emitDialogueSeen, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { grantRunReward, sanitizeIncrementalProgress } from "../../src/sim/incrementalProgress";
import { autoStartQuests } from "../../src/sim/quests";
import { damagePlayer } from "../../src/sim/systems/combat";
import { step } from "../../src/sim/tick";
import { Health, IncrementalProgress, IsPlayer, Outbox, QuestLog } from "../../src/sim/traits";

function bootRescueRoute() {
  const world = createGameWorld(246);
  autoStartQuests(world);
  instantiateMap(world, "map:rescue-route", { classId: "knight" });
  pushEvent(world, { type: "map:entered", mapId: "map:rescue-route" });
  step(world, 0);
  return world;
}

describe("S9.4 rescue-route runtime slice", () => {
  it("boots a new game onto the rescue route by config", () => {
    expect(incremental.loop.startMap).toBe("map:rescue-route");
    expect(getMap(incremental.loop.startMap).name).toBe("Rescue Road");
  });

  it("anchors knight south, dragon guard, and princess north on one map", () => {
    const map = getMap("map:rescue-route");
    const princess = map.entities.find((entity) => entity.ref === "char:princess-amber");
    const dragon = map.entities.find((entity) => entity.enemy === "dragon-guardian");
    expect(princess?.y).toBeDefined();
    expect(dragon?.y).toBeDefined();
    expect((princess?.y ?? 0) < (dragon?.y ?? 0)).toBe(true);
    expect((dragon?.y ?? 0) < map.playerSpawn.y).toBe(true);
    expect(map.playerSpawn.y).toBeGreaterThan(map.size.rows * 16 * 0.9);
    const trash = map.entities.filter(
      (entity) => entity.enemy && entity.enemy !== "dragon-guardian",
    );
    expect(trash.length).toBeGreaterThanOrEqual(5);
  });

  it("keeps the route inside the phone-session length budget", () => {
    const map = getMap("map:rescue-route");
    const routePx = map.playerSpawn.y - 64;
    const walkSeconds = routePx / 144;
    // straight-line walk well under a minute leaves a 2-5 minute run after
    // fights, bends, and dialogue
    expect(walkSeconds).toBeGreaterThan(5);
    expect(walkSeconds).toBeLessThan(60);
  });

  it("banks the wallet when the run ends in death", () => {
    const world = bootRescueRoute();
    grantRunReward(world, "enemyDefeated");
    grantRunReward(world, "enemyDefeated");
    grantRunReward(world, "enemyDefeated");

    damagePlayer(world, 9999, 0);

    const progress = world.get(IncrementalProgress);
    // base purse 12 plus three enemy bounties — all kept through death
    expect(progress?.coins).toBe(21);
    expect(progress?.lastRun).toMatchObject({
      result: "gameover",
      coinsEarned: 9,
      rosesEarned: 0,
      rescuedPrincess: false,
    });
    expect(world.get(Outbox)?.endGame).toBe("gameover");
  });

  it("shapes the next run with purchased knight-vigor ranks", () => {
    const world = createGameWorld(247);
    world.set(
      IncrementalProgress,
      sanitizeIncrementalProgress({
        purchasedUpgradeIds: ["upgrade:first-vow", "upgrade:knight-vigor"],
        upgradeRanks: { "upgrade:knight-vigor": 2 },
      }),
    );
    instantiateMap(world, "map:rescue-route", { classId: "knight" });
    expect(world.queryFirst(IsPlayer)?.get(Health)).toMatchObject({ hp: 120, maxHp: 120 });
  });

  it("advances the rescue quest from dragon fall to a paying rescue", () => {
    const quest = getQuest("quest:rescue-run");
    expect(quest.startOn?.enterMap).toBe("map:rescue-route");

    const world = bootRescueRoute();
    expect(world.get(QuestLog)?.active["quest:rescue-run"]?.stage).toBe("fell-the-dragon");

    expect(resolveDialogue(world, "dlgbank:princess-amber").nodeKey).toBe("captive");

    pushEvent(world, { type: "enemy:defeated", archetypeId: "dragon-guardian", x: 216, y: 128 });
    step(world, 0);
    expect(world.get(QuestLog)?.active["quest:rescue-run"]?.stage).toBe("reach-princess");

    const dialogue = resolveDialogue(world, "dlgbank:princess-amber");
    expect(dialogue.nodeKey).toBe("freed");
    expect(dialogue.node.lines.join(" ")).toContain("kingdom is saved");

    const rosesBefore = world.get(IncrementalProgress)?.roses ?? 0;
    emitDialogueSeen(world, dialogue.node);
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:rescue-run");
    const progress = world.get(IncrementalProgress);
    expect(progress?.roses).toBeGreaterThan(rosesBefore);
    expect(progress?.rescueCount).toBe(1);
    expect(world.get(Outbox)?.endGame).toBe("victory");
  });
});
