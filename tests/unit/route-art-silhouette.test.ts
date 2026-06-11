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

const routeArtProps = [
  "prop:hazel-arch",
  "prop:thorncutters-bundle",
  "prop:sand-sail-wreck",
  "prop:sunken-pillar-shadow",
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
  const world = createGameWorld(181);
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

describe("S8.21 route art silhouettes", () => {
  it("documents the silhouette and thorncutter pass before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twenty-Fifth Content-Depth Slice");
    expect(worldDoc).toContain("char:oldwood-thorncutter");
    expect(worldDoc).toContain("prop:sand-sail-wreck");
    expect(worldDoc).toContain("quest:oldwood-thorncutters-lantern");
  });

  it("registers detailed route silhouette props across Oldwood and Sunken Road", () => {
    for (const propId of routeArtProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    expect([...propRefs(getMap("map:oldwood-forest"))]).toEqual(
      expect.arrayContaining(["prop:hazel-arch", "prop:thorncutters-bundle"]),
    );
    expect([...propRefs(getMap("map:sunken-road"))]).toEqual(
      expect.arrayContaining(["prop:sand-sail-wreck", "prop:sunken-pillar-shadow"]),
    );
  });

  it("adds a moving Oldwood thorncutter and a non-rectangular upper path pocket", () => {
    expect(characters.get("char:oldwood-thorncutter")?.dialogue).toBe(
      "dlgbank:oldwood-thorncutter",
    );
    expect(dialogueBanks.has("dlgbank:oldwood-thorncutter")).toBe(true);

    const oldwood = getMap("map:oldwood-forest");
    expect(
      oldwood.generation.some((op) => op.note?.includes("upper hazel pocket") && op.op === "set"),
    ).toBe(true);
    const thorncutter = oldwood.entities.find(
      (entity) => entity.ref === "char:oldwood-thorncutter",
    );
    expect(thorncutter?.patrol?.points).toEqual([
      { x: 492, y: 288 },
      { x: 552, y: 288 },
      { x: 552, y: 312 },
      { x: 492, y: 312 },
    ]);
    expect(thorncutter?.patrol?.speed).toBe(21);
  });

  it("runs the thorncutter greeting questlet through dialogue into a flag", () => {
    const quest = getQuest("quest:oldwood-thorncutters-lantern");
    expect(quest.startOn?.enterMap).toBe("map:oldwood-forest");
    expect(quest.stages[0]?.log).toContain("Hester Briarhook");

    const world = bootOldwoodWorld();
    expect(world.get(QuestLog)?.active["quest:oldwood-thorncutters-lantern"]?.stage).toBe(
      "greet-thorncutter",
    );

    const dialogue = resolveDialogue(world, "dlgbank:oldwood-thorncutter");
    expect(dialogue.nodeKey).toBe("lantern");
    expect(dialogue.node.lines.join(" ")).toContain("hazel arch");
    emitDialogueChoice(world, dialogue.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:oldwood-thorncutters-lantern");
    expect(world.get(FlagState)?.values["flag:oldwood-thorncutter-greeted"]).toBe(true);
    expect(resolveDialogue(world, "dlgbank:oldwood-thorncutter").nodeKey).toBe("after");
  });

  it("moves the thorncutter patrol through Yuka steering", () => {
    const world = bootOldwoodWorld();
    const thorncutter = findNpc(world, "char:oldwood-thorncutter");
    const start = thorncutter?.get(Transform);

    expect(thorncutter?.get(NpcPatrol)?.points).toHaveLength(4);
    seconds(world, 1);

    const after = thorncutter?.get(Transform);
    expect((after?.x ?? 0) - (start?.x ?? 0)).toBeGreaterThan(8);
    expect(Math.abs((after?.y ?? 0) - (start?.y ?? 0))).toBeLessThan(2);
  });
});
