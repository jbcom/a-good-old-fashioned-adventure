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
import { autoStartQuests } from "../../src/sim/quests";
import { step } from "../../src/sim/tick";
import { FlagState, IsNpc, NpcPatrol, QuestLog, Transform } from "../../src/sim/traits";

const laybyProps = [
  "prop:shade-cloth-rig",
  "prop:water-jar-stand",
  "prop:wind-ribbon-cairn",
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

function bootOnMap(mapId: string) {
  const world = createGameWorld(151);
  autoStartQuests(world);
  instantiateMap(world, mapId, { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId });
  step(world, 0);
  return world;
}

function findNpc(world: ReturnType<typeof createGameWorld>, charId: string) {
  return [...world.query(IsNpc)].find((entity) => entity.get(IsNpc)?.charId === charId);
}

function seconds(world: ReturnType<typeof createGameWorld>, amount: number) {
  for (let i = 0; i < Math.round(amount * 60); i++) step(world);
}

describe("S8.20 Sunken Road route encounter variety", () => {
  it("documents the moving courier encounter before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-Fourth Content-Depth Slice");
    expect(worldDoc).toContain("char:sunken-courier");
    expect(worldDoc).toContain("quest:sunken-courier-warning");
    expect(worldDoc).toContain("flag:sunken-courier-warned");
  });

  it("registers a named courier, detailed layby props, and Sunken Road placements", () => {
    expect(characters.get("char:sunken-courier")?.dialogue).toBe("dlgbank:sunken-courier");
    expect(dialogueBanks.has("dlgbank:sunken-courier")).toBe(true);

    for (const propId of laybyProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    const sunkenRoad = getMap("map:sunken-road");
    expect([...propRefs(sunkenRoad)]).toEqual(expect.arrayContaining([...laybyProps]));
    expect(
      sunkenRoad.generation.some(
        (op) => op.tile === "tile:path" && op.note?.includes("shaded courier layby"),
      ),
    ).toBe(true);

    const courier = sunkenRoad.entities.find((entity) => entity.ref === "char:sunken-courier");
    expect(courier?.patrol?.points).toEqual([
      { x: 656, y: 336 },
      { x: 732, y: 336 },
      { x: 732, y: 360 },
      { x: 656, y: 360 },
    ]);
    expect(courier?.patrol?.speed).toBe(24);
  });

  it("runs the courier warning questlet through dialogue into a flag", () => {
    const quest = getQuest("quest:sunken-courier-warning");
    expect(quest.startOn?.enterMap).toBe("map:sunken-road");
    expect(quest.stages[0]?.log).toContain("Celia Knotwell");

    const world = bootOnMap("map:sunken-road");
    expect(world.get(QuestLog)?.active["quest:sunken-courier-warning"]?.stage).toBe("take-warning");

    const dialogue = resolveDialogue(world, "dlgbank:sunken-courier");
    expect(dialogue.nodeKey).toBe("warning");
    expect(dialogue.node.lines.join(" ")).toContain("ribbon-word");
    emitDialogueChoice(world, dialogue.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:sunken-courier-warning");
    expect(world.get(FlagState)?.values["flag:sunken-courier-warned"]).toBe(true);
    expect(resolveDialogue(world, "dlgbank:sunken-courier").nodeKey).toBe("after");
  });

  it("attaches and moves the courier patrol through Yuka steering", () => {
    const world = bootOnMap("map:sunken-road");
    const courier = findNpc(world, "char:sunken-courier");
    const start = courier?.get(Transform);

    expect(courier?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = courier?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(10);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
  });

  it("pays the courier warning off in Castle Scribe Elowen's briefing", () => {
    const world = bootOnMap("map:sunken-road");
    const warning = resolveDialogue(world, "dlgbank:sunken-courier");
    emitDialogueChoice(world, warning.node, "accepted");
    step(world, 0);

    instantiateMap(world, "map:castle-yard", { classId: "ranger" });
    pushEvent(world, { type: "map:entered", mapId: "map:castle-yard" });
    step(world, 0);
    instantiateMap(world, "map:castle-hall", { classId: "ranger" });

    const scribe = resolveDialogue(world, "dlgbank:castle-scribe");
    expect(scribe.nodeKey).toBe("briefing-with-courier");
    expect(scribe.node.lines.join(" ")).toContain("Celia Knotwell");
    expect(scribe.node.lines.join(" ")).toContain("Sunken Road");
    expect(scribe.node.emits).toBe("dlg:castle-scribe.briefing");
  });
});
