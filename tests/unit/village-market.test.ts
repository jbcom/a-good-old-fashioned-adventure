import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { characters, dialogueBanks, getMap } from "../../src/lib/content/registry";

describe("S8.4 Hearthwake market density", () => {
  it("documents the market-day slice before content implementation", () => {
    const worldDoc = readFileSync(resolve(process.cwd(), "docs/WORLD.md"), "utf8");
    expect(worldDoc).toContain("Eighth Content-Depth Slice");
    expect(worldDoc).toContain("market-day slice");
    expect(worldDoc).toContain("headed browser test");
  });

  it("adds named townsfolk and dialogue banks to the starting village", () => {
    expect(characters.get("char:mara-cress")?.dialogue).toBe("dlgbank:mara-cress");
    expect(characters.get("char:tobin-bell")?.dialogue).toBe("dlgbank:tobin-bell");
    expect(dialogueBanks.has("dlgbank:mara-cress")).toBe(true);
    expect(dialogueBanks.has("dlgbank:tobin-bell")).toBe(true);

    const villageRefs = getMap("map:village").entities.map((entity) => entity.ref);
    expect(villageRefs).toEqual(expect.arrayContaining(["char:mara-cress", "char:tobin-bell"]));
  });

  it("places authored market props around the Hearthwake road", () => {
    const villageRefs = getMap("map:village").entities.map((entity) => entity.ref);
    expect(villageRefs).toEqual(
      expect.arrayContaining(["prop:market-stall", "prop:notice-board", "prop:flower-cart"]),
    );
  });
});
