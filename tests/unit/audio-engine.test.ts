import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import audio from "../../src/config/audio.json";

/**
 * The howler engine plays the purchased library outright (user mandate
 * 2026-06-12) — its contract is the sample map: every music theme,
 * ambient bed, and sfx cue in src/config/audio.json must point at a real
 * file under public/assets/, and every map bgmTheme must have music.
 */

const assetsRoot = fileURLToPath(new URL("../../public/assets", import.meta.url));

const mapModules = import.meta.glob<{ bgmTheme: string }>("/src/content/world/maps/*.json", {
  eager: true,
  import: "default",
});

describe("howler sample map", () => {
  it("every mapped audio file exists on disk", () => {
    const paths = [
      ...Object.values(audio.music),
      ...Object.values(audio.ambient),
      ...Object.values(audio.sfx),
    ];
    expect(paths.length).toBeGreaterThan(40);
    for (const path of paths) {
      expect(existsSync(join(assetsRoot, path)), `missing audio file: ${path}`).toBe(true);
    }
  });

  it("every map bgmTheme resolves to a music track", () => {
    for (const [file, map] of Object.entries(mapModules)) {
      expect(
        (audio.music as Record<string, string>)[map.bgmTheme],
        `${file} bgmTheme ${map.bgmTheme} has no music entry`,
      ).toBeDefined();
    }
  });

  it("the original tone recipe cues all survived the switch", () => {
    for (const id of [
      "slash",
      "magic",
      "dash",
      "hurt",
      "shield",
      "interact",
      "inspect",
      "pickup",
      "coin",
      "levelUp",
      "chest",
      "victory",
      "rose",
    ]) {
      expect((audio.sfx as Record<string, string>)[id], `sfx ${id} unmapped`).toBeDefined();
    }
  });
});
