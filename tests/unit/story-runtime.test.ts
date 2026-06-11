import { describe, expect, it } from "vitest";
import {
  emitDialogueChoice,
  emitDialogueSeen,
  resolveDialogue,
  resolveDialogueSlot,
} from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests, questLogLines, startQuest } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import {
  FlagState,
  Health,
  IncrementalProgress,
  IsPickup,
  MapRuntime,
  Outbox,
  QuestLog,
} from "../../src/sim/traits";

function bootedWorld() {
  const world = createGameWorld(11);
  instantiateMap(world, "map:overworld", { classId: "knight" });
  autoStartQuests(world);
  return world;
}

describe("dialogue slot resolution", () => {
  it("follows quest stage state, then default", () => {
    const world = bootedWorld();
    expect(resolveDialogue(world, "dlgbank:woodcutter").nodeKey).toBe("request");

    const log = world.get(QuestLog);
    if (log) log.active["quest:broken-bridge"].stage = "cull-orcs";
    expect(resolveDialogue(world, "dlgbank:woodcutter").nodeKey).toBe("progress");

    if (log) delete log.active["quest:broken-bridge"];
    expect(resolveDialogue(world, "dlgbank:woodcutter").nodeKey).toBe("smalltalk");
  });

  it("addressable slots resolve only by direct invocation", () => {
    expect(resolveDialogueSlot("dlgbank:narrator", "intro").nodeKey).toBe("intro");
  });
});

describe("stateful shop interaction", () => {
  it("lets the shopkeeper heal the player once through dialogue-driven quest effects", () => {
    const world = createGameWorld(13);
    instantiateMap(world, "map:village-shop", { classId: "knight" });
    autoStartQuests(world);
    const player = world.queryFirst(Health);
    player?.set(Health, { hp: 50, maxHp: 100 });

    const offer = resolveDialogue(world, "dlgbank:shopkeeper");
    expect(offer.nodeKey).toBe("sample");
    emitDialogueChoice(world, offer.node, "accepted");
    step(world);

    expect(player?.get(Health)).toMatchObject({ hp: 75, maxHp: 100 });
    expect(world.get(FlagState)?.values["flag:shop-sample-claimed"]).toBe(true);
    expect(world.get(QuestLog)?.completed).toContain("quest:village-shop-sample");
    expect(world.get(Outbox)?.sfx).toContain("pickup");

    expect(resolveDialogue(world, "dlgbank:shopkeeper").nodeKey).toBe("after-sample");
  });
});

describe("the full original journey, reduced through the quest engine", () => {
  it("runs broken-bridge -> dungeon-key -> rescue-amber to victory", () => {
    const world = bootedWorld();
    const log = world.get(QuestLog);
    const flags = () => world.get(FlagState)?.values ?? {};

    // Act 1: accept the woodcutter's request
    expect(questLogLines(world)).toEqual(
      expect.arrayContaining([
        "Find & talk to the Woodcutter",
        "Buy Oswin's oat bundle from the stable counter.",
      ]),
    );
    const request = resolveDialogue(world, "dlgbank:woodcutter");
    emitDialogueChoice(world, request.node, "accepted");
    step(world);
    expect(log?.active["quest:broken-bridge"].stage).toBe("cull-orcs");
    expect(questLogLines(world)).toEqual(
      expect.arrayContaining([
        "Defeat Forest Orcs (0/4)",
        "Buy Oswin's oat bundle from the stable counter.",
      ]),
    );

    // Cull the four forest-family enemies
    for (const archetypeId of ["forest-orc", "forest-orc", "orc-scout", "forest-shaman"]) {
      pushEvent(world, { type: "enemy:defeated", archetypeId, x: 400, y: 200 });
      step(world);
    }
    expect(log?.active["quest:broken-bridge"].stage).toBe("report-back");

    // Report back: bridge repaired, flag set, tile swapped, act 2 begins
    const repaired = resolveDialogue(world, "dlgbank:woodcutter");
    expect(repaired.nodeKey).toBe("repaired");
    emitDialogueSeen(world, repaired.node);
    step(world);
    expect(flags()["flag:bridge-fixed"]).toBe(true);
    expect(world.get(MapRuntime)?.grid[27][32]).toBe("tile:wood-bridge");
    expect(world.get(MapRuntime)?.grid[28][32]).toBe("tile:wood-bridge");
    expect(world.get(MapRuntime)?.grid[29][32]).toBe("tile:wood-bridge");
    expect(log?.completed).toContain("quest:broken-bridge");
    expect(log?.active["quest:dungeon-key"].stage).toBe("seek-the-wyrm");

    // Act 2: slay the wyrm — key spawns at the corpse, spellbook dialogue queued
    pushEvent(world, { type: "enemy:defeated", archetypeId: "desert-wyrm", x: 680, y: 640 });
    step(world);
    expect(log?.active["quest:dungeon-key"].stage).toBe("claim-the-key");
    const pickups = [...world.query(IsPickup)].map((e) => e.get(IsPickup)?.itemId);
    expect(pickups).toContain("item:dungeon-key");
    expect(world.get(Outbox)?.dialogue).toEqual({
      bank: "dlgbank:spellbook",
      slot: "key-recovered",
    });

    // Pick it up, walk into the gate zone
    pushEvent(world, { type: "item:acquired", itemId: "item:dungeon-key" });
    step(world);
    expect(log?.active["quest:dungeon-key"].stage).toBe("to-the-gate");
    pushEvent(world, {
      type: "zone:entered",
      mapId: "map:overworld",
      triggerId: "trigger:castle-gate-entry",
    });
    step(world);
    expect(log?.completed).toContain("quest:dungeon-key");

    // Act 3: entering the dungeon starts the rescue
    instantiateMap(world, "map:castle-dungeon", { classId: "knight" });
    pushEvent(world, { type: "map:entered", mapId: "map:castle-dungeon" });
    step(world);
    expect(log?.active["quest:rescue-amber"].stage).toBe("survive-the-crypt");

    pushEvent(world, { type: "enemy:defeated", archetypeId: "shadow-warlord", x: 680, y: 250 });
    step(world);
    expect(log?.active["quest:rescue-amber"].stage).toBe("reach-amber");

    const rescued = resolveDialogue(world, "dlgbank:princess-amber");
    expect(rescued.nodeKey).toBe("rescued");
    emitDialogueSeen(world, rescued.node);
    step(world);
    expect(log?.completed).toContain("quest:rescue-amber");
    expect(world.get(Outbox)?.endGame).toBe("victory");
    expect(world.get(Outbox)?.sfx).toContain("victory");
    expect(world.get(IncrementalProgress)).toMatchObject({
      roses: 3,
      rescueCount: 1,
      lastRun: { result: "victory", rescuedPrincess: true },
    });
  });

  it("counters ignore non-matching archetypes", () => {
    const world = bootedWorld();
    startQuest(world, "quest:broken-bridge");
    const request = resolveDialogue(world, "dlgbank:woodcutter");
    emitDialogueChoice(world, request.node, "accepted");
    step(world);
    for (let i = 0; i < 4; i++) {
      pushEvent(world, { type: "enemy:defeated", archetypeId: "crypt-skeleton" });
      step(world);
    }
    expect(world.get(QuestLog)?.active["quest:broken-bridge"].stage).toBe("cull-orcs");
  });
});
