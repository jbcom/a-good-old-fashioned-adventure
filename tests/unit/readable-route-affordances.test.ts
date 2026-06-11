import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  animations,
  characters,
  dialogueBanks,
  getProp,
  getQuest,
} from "../../src/lib/content/registry";
import { emitDialogueSeen, resolveDialogue, resolveDialogueSlot } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, QuestLog } from "../../src/sim/traits";

const readableContracts = [
  {
    questId: "quest:oldwood-waystone",
    mapId: "map:oldwood-forest",
    propId: "prop:mossy-waystone",
    flagId: "flag:oldwood-waystone-read",
    characterId: "char:oldwood-waystone",
    bankId: "dlgbank:oldwood-waystone",
    slot: "riddle",
    dialogueEvent: "dlg:oldwood-waystone.riddle:seen",
    stage: "read-marker",
  },
  {
    questId: "quest:sunken-cart-ledger",
    mapId: "map:sunken-road",
    propId: "prop:broken-cart",
    flagId: "flag:sunken-cart-read",
    characterId: "char:sunken-cart-ledger",
    bankId: "dlgbank:sunken-cart-ledger",
    slot: "ledger",
    dialogueEvent: "dlg:sunken-cart-ledger.ledger:seen",
    stage: "read-cart",
  },
] as const;

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function bootMap(mapId: string) {
  const world = createGameWorld(31);
  autoStartQuests(world);
  instantiateMap(world, mapId, { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId });
  step(world, 0);
  return world;
}

function activeStage(world: ReturnType<typeof bootMap>, questId: string): string | undefined {
  return world.get(QuestLog)?.active[questId]?.stage;
}

describe("S8.10 readable route affordances", () => {
  it("documents the non-tavern readable route slice", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Fourteenth Content-Depth Slice");
    expect(worldDoc).toContain("Sixteenth Content-Depth Slice");
    expect(worldDoc).toContain("quest:oldwood-waystone");
    expect(worldDoc).toContain("quest:sunken-cart-ledger");
    expect(doc("docs/CONTENT-ARCHITECTURE.md")).toContain("feedback.anim");
  });

  it("registers readable prop metadata, voices, quests, and flags", () => {
    for (const contract of readableContracts) {
      expect(characters.get(contract.characterId)?.dialogue).toBe(contract.bankId);
      expect(dialogueBanks.has(contract.bankId), contract.bankId).toBe(true);
      expect(getQuest(contract.questId).startOn?.enterMap).toBe(contract.mapId);
      expect(getProp(contract.propId).interaction?.dialogue).toEqual({
        bank: contract.bankId,
        slot: contract.slot,
      });
      expect(getProp(contract.propId).interaction?.sfx).toBe("inspect");
      expect(getProp(contract.propId).interaction?.feedback?.anim).toBe("anim:inspect-pulse");
    }
    expect(getProp("prop:hearth-song-board").interaction?.sfx).toBe("inspect");
    expect(getProp("prop:hearth-song-board").interaction?.feedback?.anim).toBe(
      "anim:inspect-pulse",
    );
    expect(animations.has("anim:inspect-pulse")).toBe(true);
  });

  it("advances each route-readable quest when the prop dialogue is read", () => {
    for (const contract of readableContracts) {
      const world = bootMap(contract.mapId);
      expect(activeStage(world, contract.questId), contract.questId).toBe(contract.stage);

      const readable = resolveDialogueSlot(contract.bankId, contract.slot);
      emitDialogueSeen(world, readable.node);
      step(world, 0);

      expect(world.get(QuestLog)?.completed, contract.questId).toContain(contract.questId);
      expect(world.get(FlagState)?.values[contract.flagId], contract.flagId).toBe(true);
    }
  });

  it("lets the Oldwood waystone alter the later Hermit oath branch", () => {
    const world = bootMap("map:oldwood-forest");
    const readable = resolveDialogueSlot("dlgbank:oldwood-waystone", "riddle");
    emitDialogueSeen(world, readable.node);
    step(world, 0);

    const hermit = resolveDialogue(world, "dlgbank:hermit");
    expect(hermit.nodeKey).toBe("oath-after-waystone");
    expect(hermit.node.lines.join(" ")).toContain("waystone");
    expect(hermit.node.choices?.[0]?.id).toBe("accepted");
  });
});
