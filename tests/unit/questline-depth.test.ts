import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  getMap,
  getQuest,
  quests,
} from "../../src/lib/content/registry";
import { emitDialogueChoice, emitDialogueSeen, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, QuestLog } from "../../src/sim/traits";

function bootOnMap(mapId: string) {
  const world = createGameWorld(23);
  autoStartQuests(world);
  instantiateMap(world, mapId, { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId });
  step(world, 0);
  return world;
}

function activeStage(world: ReturnType<typeof bootOnMap>, questId: string): string | undefined {
  return world.get(QuestLog)?.active[questId]?.stage;
}

describe("S6.4 questline depth contract", () => {
  it("documents the quest-depth slice before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Third S6 Slice");
    expect(worldDoc).toContain("quest:morning-errands");
    expect(worldDoc).toContain("quest:oldwood-oath");
    expect(worldDoc).toContain("quest:lost-page");
    expect(worldDoc).toContain("char:page");
    expect(worldDoc).toContain("char:hermit");
  });

  it("has at least seven authored quests with multiple midpoint graphs", () => {
    expect(quests.size).toBeGreaterThanOrEqual(7);
    const longGraphs = [...quests.values()]
      .filter((quest) => quest.stages.filter((stage) => !stage.terminal).length >= 3)
      .map((quest) => quest.id);
    expect(longGraphs).toEqual(
      expect.arrayContaining([
        "quest:broken-bridge",
        "quest:morning-errands",
        "quest:oldwood-oath",
        "quest:lost-page",
      ]),
    );
  });

  it("adds named quest NPCs and dialogue banks to reachable maps", () => {
    expect(characters.get("char:page")?.dialogue).toBe("dlgbank:page");
    expect(characters.get("char:hermit")?.dialogue).toBe("dlgbank:hermit");
    expect(characters.get("char:lost-page")?.dialogue).toBe("dlgbank:lost-page");
    expect(dialogueBanks.has("dlgbank:page")).toBe(true);
    expect(dialogueBanks.has("dlgbank:hermit")).toBe(true);
    expect(dialogueBanks.has("dlgbank:lost-page")).toBe(true);

    const villageRefs = getMap("map:village").entities.map((entity) => entity.ref);
    const oldwoodRefs = getMap("map:oldwood-forest").entities.map((entity) => entity.ref);
    const deepForestRefs = getMap("map:deep-forest").entities.map((entity) => entity.ref);
    expect(villageRefs).toContain("char:page");
    expect(oldwoodRefs).toContain("char:hermit");
    expect(deepForestRefs).toContain("char:lost-page");
  });

  it("keeps the village errands off the original overworld boot log", () => {
    expect(getQuest("quest:morning-errands").startOn?.enterMap).toBe("map:village");
    expect(getQuest("quest:morning-errands").autoStart).not.toBe(true);
  });
});

describe("S6.4 quest runtime", () => {
  it("runs the village errand through Page Pip, Keeper Brindle, then back to Page Pip", () => {
    const world = bootOnMap("map:village");

    expect(activeStage(world, "quest:morning-errands")).toBe("find-page");
    const request = resolveDialogue(world, "dlgbank:page");
    expect(request.nodeKey).toBe("errand");
    emitDialogueChoice(world, request.node, "accepted");
    step(world);
    expect(activeStage(world, "quest:morning-errands")).toBe("fetch-cake");

    const sample = resolveDialogue(world, "dlgbank:shopkeeper");
    expect(sample.nodeKey).toBe("sample");
    emitDialogueChoice(world, sample.node, "accepted");
    step(world);
    expect(activeStage(world, "quest:morning-errands")).toBe("return-page");

    const report = resolveDialogue(world, "dlgbank:page");
    expect(report.nodeKey).toBe("report");
    emitDialogueSeen(world, report.node);
    step(world);
    expect(world.get(QuestLog)?.completed).toContain("quest:morning-errands");
    expect(world.get(FlagState)?.values["flag:morning-errands-done"]).toBe(true);
  });

  it("runs Oldwood Oath as a multi-counter combat and return chain", () => {
    const world = bootOnMap("map:oldwood-forest");

    expect(activeStage(world, "quest:oldwood-oath")).toBe("find-hermit");
    const oath = resolveDialogue(world, "dlgbank:hermit");
    expect(oath.nodeKey).toBe("oath");
    emitDialogueChoice(world, oath.node, "accepted");
    step(world);
    expect(activeStage(world, "quest:oldwood-oath")).toBe("clear-raiders");

    for (const archetypeId of ["oldwood-raider", "orc-scout"]) {
      pushEvent(world, { type: "enemy:defeated", archetypeId, x: 480, y: 280 });
      step(world);
    }
    expect(activeStage(world, "quest:oldwood-oath")).toBe("return-hermit");

    const returned = resolveDialogue(world, "dlgbank:hermit");
    expect(returned.nodeKey).toBe("return");
    emitDialogueSeen(world, returned.node);
    step(world);
    expect(activeStage(world, "quest:oldwood-oath")).toBe("carry-oath");

    pushEvent(world, {
      type: "zone:entered",
      mapId: "map:oldwood-forest",
      triggerId: "trigger:east-road",
    });
    step(world);
    expect(world.get(QuestLog)?.completed).toContain("quest:oldwood-oath");
    expect(world.get(FlagState)?.values["flag:oldwood-oath-sworn"]).toBe(true);
  });

  it("runs Lost Page Rowan as an escort-lite landmark route", () => {
    const world = bootOnMap("map:deep-forest");

    expect(activeStage(world, "quest:lost-page")).toBe("find-rowan");
    const lost = resolveDialogue(world, "dlgbank:lost-page");
    expect(lost.nodeKey).toBe("lost");
    emitDialogueChoice(world, lost.node, "guide");
    step(world);
    expect(activeStage(world, "quest:lost-page")).toBe("old-oak");

    pushEvent(world, {
      type: "zone:entered",
      mapId: "map:deep-forest",
      triggerId: "trigger:old-oak",
    });
    step(world);
    expect(activeStage(world, "quest:lost-page")).toBe("west-road");

    pushEvent(world, {
      type: "zone:entered",
      mapId: "map:deep-forest",
      triggerId: "trigger:west-road",
    });
    step(world);
    expect(world.get(QuestLog)?.completed).toContain("quest:lost-page");
    expect(world.get(FlagState)?.values["flag:lost-page-guided"]).toBe(true);
  });
});
