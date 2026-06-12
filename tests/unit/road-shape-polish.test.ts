import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getMap, props } from "../../src/lib/content/registry";

const roadProps = [
  "prop:mossy-waystone",
  "prop:fallen-log",
  "prop:bramble-hedge",
  "prop:forest-lantern-post",
];

describe("S8.7 road-shape polish", () => {
  it("documents the road-shape slice before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Eleventh Content-Depth Slice");
    expect(worldDoc).toContain("straight hallway");
    expect(worldDoc).toContain("headed browser validation");
  });

  it("adds detailed forest roadside props", () => {
    for (const propId of roadProps) {
      const prop = props.get(propId);
      expect(prop, propId).toBeDefined();
      expect(prop?.recolorChannels?.length, propId).toBeGreaterThanOrEqual(5);
      expect(prop?.states.default?.rows?.join(""), propId).toMatch(/[A-Z]/);
    }
  });

  it("places road-shape landmarks in Oldwood and Deep Forest", () => {
    const oldwoodRefs = getMap("map:oldwood-forest").entities.map((entity) => entity.ref);
    const deepRefs = getMap("map:deep-forest").entities.map((entity) => entity.ref);

    expect(oldwoodRefs).toEqual(
      expect.arrayContaining(["prop:mossy-waystone", "prop:fallen-log", "prop:bramble-hedge"]),
    );
    // deep forest swapped the shared waystone for its own root-marker flora
    expect(deepRefs).toEqual(
      expect.arrayContaining([
        "prop:threshold-root-marker",
        "prop:bramble-hedge",
        "prop:forest-lantern-post",
      ]),
    );
  });
});
