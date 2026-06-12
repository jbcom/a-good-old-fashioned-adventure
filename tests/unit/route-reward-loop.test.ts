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
import { autoStartQuests, questLogLines } from "../../src/sim/quests";
import { buyShopListing } from "../../src/sim/shop";
import { step } from "../../src/sim/tick";
import { FlagState, QuestLog } from "../../src/sim/traits";

const rewardProps = ["prop:roadward-stool", "prop:oat-string-post"] as const;

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

function bootStableWorld() {
  const world = createGameWorld(83);
  autoStartQuests(world);
  instantiateMap(world, "map:village-stable", { classId: "ranger" });
  pushEvent(world, { type: "map:entered", mapId: "map:village-stable" });
  step(world, 0);
  return world;
}

describe("S8.16 route reward loop", () => {
  it("documents the stable-to-Oldwood payoff before content implementation", () => {
    const worldDoc = doc("docs/WORLD.md");
    expect(worldDoc).toContain("Twentieth Content-Depth Slice");
    expect(worldDoc).toContain("quest:oldwood-oat-token");
    expect(worldDoc).toContain("blue oat-string");
    expect(worldDoc).toContain("flag:oldwood-roadward-mark");
  });

  it("registers the Oldwood roadward scene and detailed route reward props", () => {
    expect(characters.get("char:oldwood-roadward")?.dialogue).toBe("dlgbank:oldwood-roadward");
    expect(dialogueBanks.has("dlgbank:oldwood-roadward")).toBe(true);

    for (const propId of rewardProps) {
      const prop = getProp(propId);
      expect(prop.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = stateRows(prop);
      expect(rows.length, propId).toBeGreaterThan(0);
      for (const row of rows) expect(row, propId).toHaveLength(prop.grid.w);
      expect(channels(rows).size, propId).toBeGreaterThanOrEqual(5);
    }

    const oldwood = getMap("map:oldwood-forest");
    expect([...propRefs(oldwood)]).toEqual(expect.arrayContaining([...rewardProps]));
    expect(oldwood.entities.map((entity) => entity.ref)).toContain("char:oldwood-roadward");
  });

  it("opens a quiet route-reward quest from Oswin's shop buy event", () => {
    const quest = getQuest("quest:oldwood-oat-token");
    expect(quest.autoStart).toBe(true);
    expect(quest.stages[0]).toMatchObject({ id: "wait-for-stable-service" });
    expect(quest.stages[0]?.log).toBeUndefined();
    expect(quest.stages[0]?.advance?.[0]?.when).toEqual({
      shopTransaction: {
        verb: "buy",
        shop: "shop:oswin-stable-counter",
        listing: "oat-bundle",
      },
    });
  });

  it("turns the stable buy into a roadward mark and Hermit acknowledgement", () => {
    const world = bootStableWorld();
    expect(questLogLines(world).join(" ")).not.toContain("blue oat-string");

    buyShopListing(world, "shop:oswin-stable-counter", "oat-bundle");
    step(world, 0);

    expect(world.get(QuestLog)?.active["quest:oldwood-oat-token"]?.stage).toBe("find-roadward");
    expect(questLogLines(world).join(" ")).toContain("blue oat-string");

    instantiateMap(world, "map:oldwood-forest", { classId: "ranger" });
    pushEvent(world, { type: "map:entered", mapId: "map:oldwood-forest" });
    step(world, 0);

    const roadward = resolveDialogue(world, "dlgbank:oldwood-roadward");
    expect(roadward.nodeKey).toBe("oat-token");
    expect(roadward.node.lines.join(" ")).toContain("blue oat-string");
    expect(roadward.node.choices?.[0]?.id).toBe("accepted");
    emitDialogueChoice(world, roadward.node, "accepted");
    step(world, 0);

    expect(world.get(QuestLog)?.completed).toContain("quest:oldwood-oat-token");
    expect(world.get(FlagState)?.values["flag:oldwood-roadward-mark"]).toBe(true);
    expect(questLogLines(world).join(" ")).not.toContain("blue oat-string");

    const hermit = resolveDialogue(world, "dlgbank:hermit");
    expect(hermit.nodeKey).toBe("oath-after-roadward");
    expect(hermit.node.lines.join(" ")).toContain("roadward");
    expect(hermit.node.lines.join(" ")).toContain("drive two raiders");
    expect(hermit.node.emits).toBe("dlg:hermit.oath");
  });
});
