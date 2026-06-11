import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  getMap,
  getProp,
  getQuest,
} from "../../src/lib/content/registry";
import type { PropDef, PropState } from "../../src/lib/content/types";
import { emitDialogueChoice, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, IsNpc, NpcPatrol, QuestLog, Transform } from "../../src/sim/traits";

const approachProps = ["prop:wayside-cloak-stand", "prop:pilgrim-kettle"] as const;

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

function bootApproachWorld() {
  const world = createGameWorld(211);
  autoStartQuests(world);
  instantiateMap(world, "map:castle-approach", { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId: "map:castle-approach" });
  step(world, 0);
  return world;
}

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("S8.23 Castle Approach composition revision", () => {
  it("documents the removal of the west approach open-space exception", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-Sixth Content-Depth Slice");
    expect(worldDoc).toContain("char:approach-pilgrim");
    expect(worldDoc).toContain("quest:approach-pilgrim-warning");
    expect(worldDoc).toContain("composition.routeWindows");
  });

  it("registers Aveline, detailed approach props, and a non-open composition window", () => {
    expect(characters.get("char:approach-pilgrim")?.dialogue).toBe("dlgbank:approach-pilgrim");
    expect(dialogueBanks.has("dlgbank:approach-pilgrim")).toBe(true);

    for (const propId of approachProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    const approach = getMap("map:castle-approach");
    const westWindow = approach.composition?.routeWindows?.find((window) =>
      window.label.includes("Aveline"),
    );
    expect(westWindow?.openReason).toBeUndefined();
    expect(westWindow?.majorAnchors).toEqual(
      expect.arrayContaining(["char:approach-pilgrim", "prop:wayside-cloak-stand"]),
    );
    expect(westWindow?.minorProps).toEqual(
      expect.arrayContaining(["prop:signpost", "prop:pilgrim-kettle"]),
    );
    expect(approach.generation.some((op) => op.note?.includes("wayside pilgrim"))).toBe(true);
  });

  it("runs the pilgrim warning quest through dialogue into Gwydion's later line", () => {
    const quest = getQuest("quest:approach-pilgrim-warning");
    expect(quest.startOn?.enterMap).toBe("map:castle-approach");
    expect(quest.stages[0]?.log).toContain("Aveline Dustcoat");

    const world = bootApproachWorld();
    expect(world.get(QuestLog)?.active["quest:approach-pilgrim-warning"]?.stage).toBe(
      "take-warning",
    );

    const warning = resolveDialogue(world, "dlgbank:approach-pilgrim");
    expect(warning.nodeKey).toBe("warning");
    expect(warning.node.lines.join(" ")).toContain("gate wind");
    emitDialogueChoice(world, warning.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:approach-pilgrim-warning");
    expect(world.get(FlagState)?.values["flag:approach-pilgrim-warned"]).toBe(true);

    const gwydion = resolveDialogue(world, "dlgbank:gwydion");
    expect(gwydion.nodeKey).toBe("hint-after-pilgrim");
    expect(gwydion.node.lines.join(" ")).toContain("Aveline");
    expect(gwydion.node.emits).toBe("dlg:gwydion.hint");
  });

  it("moves Aveline through a Yuka patrol loop", () => {
    const world = bootApproachWorld();
    const pilgrim = findNpc(world, "char:approach-pilgrim");
    const start = pilgrim?.get(Transform);

    expect(pilgrim?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = pilgrim?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(8);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
  });
});
