import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  getDialogueBank,
  getProp,
  getQuest,
} from "../../src/lib/content/registry";
import { emitDialogueSeen, resolveDialogue, resolveDialogueSlot } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, QuestLog } from "../../src/sim/traits";

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function bootTavern() {
  const world = createGameWorld(29);
  autoStartQuests(world);
  instantiateMap(world, "map:village-tavern", { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId: "map:village-tavern" });
  step(world, 0);
  return world;
}

function activeStage(world: ReturnType<typeof bootTavern>, questId: string): string | undefined {
  return world.get(QuestLog)?.active[questId]?.stage;
}

describe("S8.9 tavern notice-board questlet", () => {
  it("documents the notice-board questlet and readable prop interaction contract", () => {
    expect(doc("docs/WORLD.md")).toContain("Thirteenth Content-Depth Slice");
    expect(doc("docs/WORLD.md")).toContain("quest:tavern-song");
    expect(doc("docs/CONTENT-ARCHITECTURE.md")).toContain("dialogue bank/slot for readable props");
  });

  it("registers the board voice, quest, flag, and readable prop metadata", () => {
    expect(characters.get("char:hearth-song-board")?.dialogue).toBe("dlgbank:hearth-song-board");
    expect(dialogueBanks.has("dlgbank:hearth-song-board")).toBe(true);
    expect(getQuest("quest:tavern-song").startOn?.enterMap).toBe("map:village-tavern");
    expect(getProp("prop:hearth-song-board").interaction?.dialogue).toEqual({
      bank: "dlgbank:hearth-song-board",
      slot: "verse",
    });
    expect(getDialogueBank("dlgbank:merrin-underbough").slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          when: { quest: "quest:tavern-song", stage: "ask-merrin" },
          node: "song",
        }),
      ]),
    );
  });

  it("runs the tavern song questlet from board read to Merrin follow-up", () => {
    const world = bootTavern();
    expect(activeStage(world, "quest:tavern-song")).toBe("read-board");

    const board = resolveDialogueSlot("dlgbank:hearth-song-board", "verse");
    expect(board.nodeKey).toBe("verse");
    emitDialogueSeen(world, board.node);
    step(world);
    expect(activeStage(world, "quest:tavern-song")).toBe("ask-merrin");

    const merrin = resolveDialogue(world, "dlgbank:merrin-underbough");
    expect(merrin.nodeKey).toBe("song");
    emitDialogueSeen(world, merrin.node);
    step(world);

    expect(world.get(QuestLog)?.completed).toContain("quest:tavern-song");
    expect(world.get(FlagState)?.values["flag:tavern-song-learned"]).toBe(true);
    expect(resolveDialogue(world, "dlgbank:merrin-underbough").nodeKey).toBe("after-song");
  });
});
