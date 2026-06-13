import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assetUrl } from "../../src/lib/assets";

/**
 * Asset URLs must resolve under the deployment BASE (Vite `base: "./"`), not as
 * an absolute `/assets/...` — an absolute path ignores GitHub Pages' project
 * subpath and 404s there, silently falling every sheet sprite / tile / font /
 * audio file back to its procedural placeholder. The test env runs at base "/"
 * so it can't reproduce the Pages subpath; these gates lock the path SHAPE so a
 * regression to an absolute `/assets/` literal fails here, before it ships.
 */
describe("asset URL resolves under the deployment base", () => {
  it("joins the base and assets path without a leading-slash absolute", () => {
    const url = assetUrl("tilemaps/roguelike.png");
    // in the test env BASE_URL is "/", so the URL is "/assets/...". The contract
    // is that it is BASE_URL + "/assets/" — not a hardcoded absolute that would
    // ignore a subpath base.
    expect(url.endsWith("/assets/tilemaps/roguelike.png")).toBe(true);
    expect(url).not.toContain("//assets");
  });

  it("no source file hardcodes an absolute /assets/ URL for a loaded resource", () => {
    // the runtime resource loaders (sheet images, audio) must route through
    // assetUrl, never a bare `/assets/` template literal — those break on Pages.
    for (const file of [
      "src/render/atlas.ts",
      "src/audio/howlerEngine.ts",
      "src/persistence/saveRepository.ts",
    ]) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      // a backtick/quote-led `/assets/` literal is the bug pattern; assetUrl()
      // and comments are fine
      const bad = src.match(/[`"']\/assets\//g);
      expect(bad, `${file} hardcodes an absolute /assets/ URL: ${bad}`).toBeNull();
    }
  });
});
