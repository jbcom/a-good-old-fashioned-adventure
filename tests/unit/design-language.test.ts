import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ui from "../../src/config/ui.json";
import { DIORAMA_FRAGMENT_SHADER } from "../../src/render/materials";

const appCss = readFileSync(resolve(process.cwd(), "src/app/App.css"), "utf8");
const fontDir = resolve(process.cwd(), "public/assets/fonts");

const requiredFonts = [
  "im-fell-english-sc-400.ttf",
  "eb-garamond-400.ttf",
  "eb-garamond-600.ttf",
  "eb-garamond-700.ttf",
  "alegreya-sans-500.ttf",
  "alegreya-sans-700.ttf",
];

describe("Errant Storybook design language", () => {
  it("defines owned typography and color tokens instead of arcade or cyberpunk defaults", () => {
    expect(ui.language.id).toBe("errant-storybook");
    expect(ui.language.summary).toContain("knights-errant");
    expect(ui.typography.display.family).toContain("IM Fell English SC");
    expect(ui.typography.body.family).toContain("EB Garamond");
    expect(ui.typography.numeric.family).toContain("Alegreya Sans");
    expect(JSON.stringify(ui).toLowerCase()).not.toContain("press start");
    expect(JSON.stringify(ui).toLowerCase()).not.toContain("old-road-diorama");
    expect(ui.theme.accentGold.toLowerCase()).not.toBe("#f7e214");
    expect(ui.theme.accentBlue.toLowerCase()).not.toBe("#58c4d8");
    expect(ui.theme.panel.toLowerCase()).toContain("241, 224, 185");
  });

  it("keeps app chrome wired to tokenized font and color roles", () => {
    expect(appCss).toContain("@font-face");
    expect(appCss).toContain("--font-display");
    expect(appCss).toContain("--accent");
    expect(appCss).toContain("/assets/fonts/im-fell-english-sc-400.ttf");
    expect(appCss).toContain("/assets/fonts/eb-garamond-400.ttf");
    expect(appCss).toContain("/assets/fonts/alegreya-sans-500.ttf");
    expect(appCss.toLowerCase()).not.toContain("fonts.googleapis");
    expect(appCss.toLowerCase()).not.toContain("fonts.gstatic");
    expect(appCss.toLowerCase()).not.toContain("press start");
    expect(appCss.toLowerCase()).not.toContain("#f7e214");
    expect(appCss.toLowerCase()).not.toContain("var(--rose), var(--aether)");
    expect(appCss.toLowerCase()).toContain("vellum");
  });

  it("self-hosts the researched storybook fonts with non-empty local assets", () => {
    for (const font of requiredFonts) {
      expect(statSync(resolve(fontDir, font)).size, font).toBeGreaterThan(40_000);
    }
  });

  it("uses a manuscript-wash shader language rather than flat or neon staging", () => {
    expect(DIORAMA_FRAGMENT_SHADER).toContain("uVellumLight");
    expect(DIORAMA_FRAGMENT_SHADER).toContain("uPaperGrain");
    expect(DIORAMA_FRAGMENT_SHADER).toContain("uInkWash");
    expect(DIORAMA_FRAGMENT_SHADER.toLowerCase()).not.toContain("scanline");
    expect(DIORAMA_FRAGMENT_SHADER.toLowerCase()).not.toContain("neon");
  });
});
