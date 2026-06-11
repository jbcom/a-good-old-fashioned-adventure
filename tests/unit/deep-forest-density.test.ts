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
import type { MapDef, PropDef, PropState } from "../../src/lib/content/types";
import { emitDialogueChoice, resolveDialogue } from "../../src/sim/dialogue";
import { pushEvent } from "../../src/sim/events";
import { createGameWorld, instantiateMap } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { FlagState, IsNpc, NpcPatrol, QuestLog, Transform } from "../../src/sim/traits";

const deepForestProps = ["prop:fern-mender-cart", "prop:glowcap-ring"] as const;

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function propRefs(map: MapDef): Set<string> {
  return new Set(
    map.entities
      .map((entity) => entity.ref)
      .filter((ref): ref is string => !!ref && ref.startsWith("prop:")),
  );
}

function stateRows(prop: PropDef): string[] {
  const state = (prop.states.default ?? Object.values(prop.states)[0]) as PropState;
  return state.rows ?? [];
}

function channels(rows: string[]): Set<string> {
  return new Set(rows.join("").replaceAll(".", "").split(""));
}

function bootDeepForestWorld() {
  const world = createGameWorld(97);
  instantiateMap(world, "map:deep-forest", { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId: "map:deep-forest" });
  step(world, 0);
  return world;
}

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("S8.17 Deep Forest visual-story density", () => {
  it("documents the moving fern-mender scene before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-First Content-Depth Slice");
    expect(worldDoc).toContain("char:fern-mender");
    expect(worldDoc).toContain("prop:fern-mender-cart");
    expect(worldDoc).toContain("quest:deep-forest-fern-light");
  });

  it("registers a named fern-mender, rich props, and Deep Forest placements", () => {
    expect(characters.get("char:fern-mender")?.dialogue).toBe("dlgbank:fern-mender");
    expect(dialogueBanks.has("dlgbank:fern-mender")).toBe(true);

    for (const propId of deepForestProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    const deepForest = getMap("map:deep-forest");
    expect([...propRefs(deepForest)]).toEqual(expect.arrayContaining([...deepForestProps]));
    const fernMender = deepForest.entities.find((entity) => entity.ref === "char:fern-mender");
    expect(fernMender?.patrol?.points).toEqual([
      { x: 220, y: 320 },
      { x: 284, y: 320 },
      { x: 284, y: 348 },
      { x: 220, y: 348 },
    ]);
    expect(fernMender?.patrol?.speed).toBe(22);
  });

  it("runs the fern-light questlet through dialogue into a flag", () => {
    const quest = getQuest("quest:deep-forest-fern-light");
    expect(quest.startOn?.enterMap).toBe("map:deep-forest");
    expect(quest.stages[0]?.log).toContain("Linnet Fernwise");

    const world = bootDeepForestWorld();
    expect(world.get(QuestLog)?.active["quest:deep-forest-fern-light"]?.stage).toBe(
      "greet-fern-mender",
    );

    const dialogue = resolveDialogue(world, "dlgbank:fern-mender");
    expect(dialogue.nodeKey).toBe("start");
    expect(dialogue.node.lines.join(" ")).toContain("fern-lamps");
    emitDialogueChoice(world, dialogue.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:deep-forest-fern-light");
    expect(world.get(FlagState)?.values["flag:fern-mender-greeted"]).toBe(true);
    expect(resolveDialogue(world, "dlgbank:fern-mender").nodeKey).toBe("after");
  });

  it("attaches and moves the fern-mender patrol through Yuka steering", () => {
    const world = bootDeepForestWorld();
    const fernMender = findNpc(world, "char:fern-mender");
    const start = fernMender?.get(Transform);

    expect(fernMender?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = fernMender?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(10);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
  });
});
