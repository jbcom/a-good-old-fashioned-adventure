import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Tone audio engine", () => {
  it("keeps BGM scheduling local to each engine instance", () => {
    const source = readFileSync(new URL("../../src/audio/toneEngine.ts", import.meta.url), "utf8");

    expect(source).not.toContain("Tone.Transport");
    expect(source).not.toContain("new Tone.Loop");
    expect(source).toContain("window.setInterval");
  });
});
