import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { characters, dialogueBanks, getMap, props } from "../../src/lib/content/registry";

const livelihoodProps = [
  "prop:vine-trellis",
  "prop:bakery-oven",
  "prop:laundry-line",
  "prop:seed-crates",
];

describe("S8.6 Hearthwake livelihood", () => {
  it("documents the livelihood slice before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Tenth Content-Depth Slice");
    expect(worldDoc).toContain("Hearthwake still needs ordinary life around the road");
    expect(worldDoc).toContain("headed browser validation");
  });

  it("adds domestic storybook props with multi-channel pixel detail", () => {
    for (const propId of livelihoodProps) {
      const prop = props.get(propId);
      expect(prop, propId).toBeDefined();
      expect(prop?.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      const rows = prop?.states.default?.rows ?? [];
      expect(rows.join(""), propId).toMatch(/[A-Z]/);
    }
  });

  it("places the livelihood props and named baker in Hearthwake Village", () => {
    const villageRefs = getMap("map:village").entities.map((entity) => entity.ref);
    expect(villageRefs).toEqual(expect.arrayContaining(livelihoodProps));
    expect(villageRefs).toContain("char:tamsin-hearth");
  });

  it("adds Tamsin Hearth as a talkable village voice", () => {
    expect(characters.get("char:tamsin-hearth")?.dialogue).toBe("dlgbank:tamsin-hearth");
    expect(dialogueBanks.has("dlgbank:tamsin-hearth")).toBe(true);
  });
});
