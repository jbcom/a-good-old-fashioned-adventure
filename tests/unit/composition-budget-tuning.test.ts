import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  characters,
  dialogueBanks,
  flags,
  getMap,
  getProp,
  getQuest,
} from "../../src/lib/content/registry";
import type { MapDef, PropDef, PropState } from "../../src/lib/content/types";
import { emitDialogueChoice, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, IsNpc, NpcPatrol, QuestLog, Transform } from "../../src/sim/traits";

const budgetProps = [
  "prop:lantern-oil-crate",
  "prop:keeper-bell-stake",
  "prop:threshold-root-marker",
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

function bootOldwoodWorld() {
  const world = createGameWorld(244);
  autoStartQuests(world);
  instantiateMap(world, "map:oldwood-forest", { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId: "map:oldwood-forest" });
  step(world, 0);
  return world;
}

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("S8.24 composition budget tuning", () => {
  it("documents the stricter route-window budget before content implementation", () => {
    const compositionDoc = doc("docs/CONTENT-COMPOSITION.md");
    const compactCompositionDoc = compositionDoc.replace(/\s+/g, " ");
    const worldDoc = doc("docs/WORLD.md");

    expect(compactCompositionDoc).toContain("Current mandatory route maps should not need it");
    expect(worldDoc).toContain("Twenty-Seventh Content-Depth Slice");
    expect(worldDoc).toContain("char:oldwood-lantern-keeper");
    expect(worldDoc).toContain("quest:oldwood-lantern-keeper");
  });

  it("adds detailed budget props to the former sparse Oldwood and Deep Forest windows", () => {
    for (const propId of budgetProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    expect([...propRefs(getMap("map:oldwood-forest"))]).toEqual(
      expect.arrayContaining(["prop:lantern-oil-crate", "prop:keeper-bell-stake"]),
    );
    expect([...propRefs(getMap("map:deep-forest"))]).toEqual(
      expect.arrayContaining(["prop:lantern-oil-crate", "prop:threshold-root-marker"]),
    );
  });

  it("removes open-space reliance from current mandatory route windows", () => {
    for (const mapId of [
      "map:village",
      "map:oldwood-forest",
      "map:deep-forest",
      "map:sunken-road",
      "map:castle-approach",
    ]) {
      const map = getMap(mapId);
      for (const window of map.composition?.routeWindows ?? []) {
        expect(window.openReason, `${mapId}:${window.label}`).toBeUndefined();
      }
    }
  });

  it("runs the lantern keeper greeting through dialogue into a flag", () => {
    expect(characters.get("char:oldwood-lantern-keeper")?.dialogue).toBe(
      "dlgbank:oldwood-lantern-keeper",
    );
    expect(dialogueBanks.has("dlgbank:oldwood-lantern-keeper")).toBe(true);
    expect(flags.has("flag:oldwood-lantern-kept")).toBe(true);

    const quest = getQuest("quest:oldwood-lantern-keeper");
    expect(quest.startOn?.enterMap).toBe("map:oldwood-forest");
    expect(quest.stages[0]?.log).toContain("last lantern");

    const world = bootOldwoodWorld();
    expect(world.get(QuestLog)?.active["quest:oldwood-lantern-keeper"]?.stage).toBe("greet-keeper");

    const dialogue = resolveDialogue(world, "dlgbank:oldwood-lantern-keeper");
    expect(dialogue.nodeKey).toBe("lantern");
    expect(dialogue.node.lines.join(" ")).toContain("last lantern");
    emitDialogueChoice(world, dialogue.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:oldwood-lantern-keeper");
    expect(world.get(FlagState)?.values["flag:oldwood-lantern-kept"]).toBe(true);
    expect(resolveDialogue(world, "dlgbank:oldwood-lantern-keeper").nodeKey).toBe("after");
  });

  it("moves the lantern keeper patrol through Yuka steering", () => {
    const world = bootOldwoodWorld();
    const keeper = findNpc(world, "char:oldwood-lantern-keeper");
    const start = keeper?.get(Transform);

    expect(keeper?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = keeper?.get(Transform);
    expect(Math.abs((after?.x ?? 0) - (start?.x ?? 0))).toBeGreaterThan(6);
  });
});
