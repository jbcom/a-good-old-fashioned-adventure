import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  animations,
  characters,
  dialogueBanks,
  getDialogueBank,
  getMap,
  getProp,
  getQuest,
} from "../../src/lib/content/registry";
import type { MapDef, PropDef, PropState } from "../../src/lib/content/types";
import { emitDialogueSeen, resolveDialogue, resolveDialogueSlot } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, QuestLog } from "../../src/sim/traits";

const doorstepProps = [
  "prop:village-letter-basket",
  "prop:stoop-lantern",
  "prop:dooryard-flower-stand",
] as const;

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function stateRows(prop: PropDef): string[] {
  const state = (prop.states.default ?? Object.values(prop.states)[0]) as PropState;
  return state.rows ?? [];
}

function channels(rows: string[]): Set<string> {
  return new Set(rows.join("").replaceAll(".", "").split(""));
}

function propRefs(map: MapDef): Set<string> {
  return new Set(
    map.entities
      .map((entity) => entity.ref)
      .filter((ref): ref is string => !!ref && ref.startsWith("prop:")),
  );
}

function bootVillageWorld() {
  const world = createGameWorld(143);
  autoStartQuests(world);
  instantiateMap(world, "map:village", { classId: "knight" });
  pushEvent(world, { type: "map:entered", mapId: "map:village" });
  step(world, 0);
  return world;
}

describe("S8.19 Hearthwake route composition", () => {
  it("documents the doorstep interaction before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-Third Content-Depth Slice");
    expect(worldDoc).toContain("prop:village-letter-basket");
    expect(worldDoc).toContain("quest:village-letter-basket");
    expect(worldDoc).toContain("flag:village-letter-basket-read");
  });

  it("registers detailed doorstep props and places them in Hearthwake Village", () => {
    const village = getMap("map:village");
    expect([...propRefs(village)]).toEqual(expect.arrayContaining([...doorstepProps]));

    for (const propId of doorstepProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    expect(
      village.generation.some(
        (op) =>
          op.op === "region" &&
          op.tile === "tile:village-cobble" &&
          op.note?.includes("letter-basket stoop"),
      ),
    ).toBe(true);
    expect(
      village.generation.filter(
        (op) =>
          op.op === "set" &&
          op.tile === "tile:village-cobble" &&
          op.note?.includes("letter-basket stoop"),
      ),
    ).toHaveLength(4);
  });

  it("wires the village letter-basket readable prop to dialogue, feedback, and quest state", () => {
    expect(characters.get("char:village-letter-basket")?.dialogue).toBe(
      "dlgbank:village-letter-basket",
    );
    expect(dialogueBanks.has("dlgbank:village-letter-basket")).toBe(true);
    expect(animations.has("anim:inspect-pulse")).toBe(true);

    const basket = getProp("prop:village-letter-basket");
    expect(basket.interaction).toMatchObject({
      verb: "read",
      method: "action-button",
      sfx: "inspect",
      feedback: { anim: "anim:inspect-pulse" },
      dialogue: { bank: "dlgbank:village-letter-basket", slot: "note" },
    });

    const quest = getQuest("quest:village-letter-basket");
    expect(quest.startOn?.enterMap).toBe("map:village");
    expect(quest.stages[0]?.advance?.[0]?.when).toEqual({
      dialogueEvent: "dlg:village-letter-basket.note:seen",
    });
  });

  it("lets reading the letter-basket alter Page Pip's later errand line", () => {
    const world = bootVillageWorld();
    expect(world.get(QuestLog)?.active["quest:village-letter-basket"]?.stage).toBe("read-letter");

    const note = resolveDialogueSlot("dlgbank:village-letter-basket", "note");
    expect(note.node.lines.join(" ")).toContain("doorstep");
    emitDialogueSeen(world, note.node);
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:village-letter-basket");
    expect(world.get(FlagState)?.values["flag:village-letter-basket-read"]).toBe(true);

    const page = resolveDialogue(world, "dlgbank:page");
    expect(page.nodeKey).toBe("errand-after-letter");
    expect(page.node.lines.join(" ")).toContain("letter-basket");
    expect(page.node.emits).toBe("dlg:page.errand");

    const pageBank = getDialogueBank("dlgbank:page");
    expect(pageBank.nodes["errand-after-letter"].choices?.[0]?.id).toBe("accepted");
  });
});
