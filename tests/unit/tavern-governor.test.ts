import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { characters, getDialogueBank, getMap, props } from "../../src/lib/content/registry";
import {
  chooseGovernorPlanAction,
  type GovernorPlanStep,
  type PlayerPerception,
} from "../harness/playerGovernorModel";

const tavernProps = ["prop:tavern-bench", "prop:hearth-song-board", "prop:story-quilt"];

function doc(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function propRefs(mapId: string): string[] {
  return getMap(mapId)
    .entities.map((entity) => entity.ref)
    .filter((ref): ref is string => !!ref && ref.startsWith("prop:"));
}

function near(x: number, y: number, tolerance: number) {
  return (perception: PlayerPerception) => {
    const dx = x - (perception.diagnostics?.x ?? 0);
    const dy = y - (perception.diagnostics?.y ?? 0);
    return Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance;
  };
}

describe("S8.8 tavern governor depth", () => {
  it("documents the tavern-governor slice before content implementation", () => {
    expect(doc("docs/WORLD.md")).toContain("Twelfth Content-Depth Slice");
    expect(doc("docs/WORLD.md")).toContain("Unfurled Vine tavern cluster");
    expect(doc("docs/PLAYER-GOVERNOR.md")).toContain("AdventurePlan");
  });

  it("chooses the first unsatisfied plan step from public perception", () => {
    const plan: GovernorPlanStep[] = [
      {
        id: "enter-tavern",
        goal: { kind: "mapNameIncludes", text: "Unfurled Vine" },
        actions: [{ id: "walk-to-door", kind: "reachPoint", x: 704, y: 220, cost: 1 }],
      },
      {
        id: "talk-to-merrin",
        goal: { kind: "dialogueIncludes", text: "Merrin Underbough" },
        actions: [
          {
            id: "walk-to-merrin",
            kind: "reachPoint",
            x: 224,
            y: 152,
            cost: 1,
            when: (perception) => !near(224, 152, 20)(perception),
          },
          {
            id: "press-a-near-merrin",
            kind: "press",
            button: "a",
            cost: 2,
            when: near(224, 152, 20),
          },
        ],
      },
    ];

    const villagePerception: PlayerPerception = {
      mode: "playing",
      mapName: "Hearthwake Village",
      topHudText: "RANGER LV 1 HP 100% Hearthwake Village",
      dialogueText: "",
      questText: "Visit the tavern",
      visibleButtons: ["button-a", "button-b"],
      diagnostics: { mapId: "map:village", x: 620, y: 220, hp: 100, enemies: 0 },
    };
    expect(chooseGovernorPlanAction(villagePerception, plan)?.step.id).toBe("enter-tavern");
    expect(chooseGovernorPlanAction(villagePerception, plan)?.action.id).toBe("walk-to-door");

    const tavernPerception: PlayerPerception = {
      ...villagePerception,
      mapName: "The Unfurled Vine",
      topHudText: "RANGER LV 1 HP 100% The Unfurled Vine",
      diagnostics: { mapId: "map:village-tavern", x: 224, y: 152, hp: 100, enemies: 0 },
    };
    expect(chooseGovernorPlanAction(tavernPerception, plan)?.step.id).toBe("talk-to-merrin");
    expect(chooseGovernorPlanAction(tavernPerception, plan)?.action.id).toBe("press-a-near-merrin");
  });

  it("adds detailed tavern props and a named social NPC", () => {
    for (const propId of tavernProps) {
      expect(props.has(propId), propId).toBe(true);
    }

    const tavernRefs = propRefs("map:village-tavern");
    expect(tavernRefs).toEqual(expect.arrayContaining(tavernProps));
    expect(getMap("map:village-tavern").entities.map((entity) => entity.ref)).toContain(
      "char:merrin-underbough",
    );

    const merrin = characters.get("char:merrin-underbough");
    expect(merrin?.name).toBe("Merrin Underbough");
    expect(merrin?.dialogue).toBe("dlgbank:merrin-underbough");
    expect(getDialogueBank("dlgbank:merrin-underbough").nodes.welcome.lines.join(" ")).toContain(
      "story-quilt",
    );
  });
});
