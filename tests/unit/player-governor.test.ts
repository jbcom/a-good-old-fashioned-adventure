import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chooseGovernorAction,
  type GovernorAction,
  goalSatisfied,
  type PlayerPerception,
} from "../harness/playerGovernorModel";

const doc = readFileSync(resolve(process.cwd(), "docs/PLAYER-GOVERNOR.md"), "utf8");

describe("player-governor contract", () => {
  it("documents a public-input validation player instead of private sim control", () => {
    expect(doc).toContain("test-side player governor");
    expect(doc).toContain("directional input, A, B");
    expect(doc).toContain("Shell `data-*` state may be used for failure diagnostics");
    expect(doc).toContain("never writes sim state");
    expect(doc).toContain("AI-vs-AI");
  });

  it("satisfies goals from public perception text", () => {
    const perception: PlayerPerception = {
      mode: "playing",
      mapName: "Cottage Interior",
      topHudText: "KNIGHT LV 1 HP 100% Cottage Interior",
      dialogueText: "",
      questText: "",
      visibleButtons: ["button-a", "button-b"],
      diagnostics: { mapId: "map:village-house", x: 192, y: 180, hp: 100, enemies: 0 },
    };

    expect(goalSatisfied({ kind: "mapNameIncludes", text: "Cottage" }, perception)).toBe(true);
    expect(goalSatisfied({ kind: "dialogueIncludes", text: "kingdom is saved" }, perception)).toBe(
      false,
    );
  });

  it("chooses the cheapest currently available action", () => {
    const perception: PlayerPerception = {
      mode: "playing",
      mapName: "Hearthwake Village",
      topHudText: "KNIGHT LV 1 HP 100% Hearthwake Village",
      dialogueText: "",
      questText: "Morning errands",
      visibleButtons: ["button-a", "button-b"],
      diagnostics: { mapId: "map:village", x: 140, y: 208, hp: 100, enemies: 0 },
    };
    const actions: GovernorAction[] = [
      { id: "press-a", kind: "press", button: "a", cost: 5 },
      {
        id: "walk-right",
        kind: "hold",
        button: "right",
        durationMs: 260,
        cost: 1,
        when: (current) => current.mapName.includes("Village"),
      },
    ];

    expect(chooseGovernorAction(perception, actions).id).toBe("walk-right");
  });
});
