import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app runtime cadence", () => {
  it("keeps autosave cadence out of the frame-critical path", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/App.tsx"), "utf8");
    const uiConfig = JSON.parse(readFileSync(resolve(process.cwd(), "src/config/ui.json"), "utf8"));

    expect(uiConfig.persistence.autosaveIntervalMs).toBe(15_000);
    expect(source).toContain("const AUTO_SAVE_INTERVAL_MS = ui.persistence.autosaveIntervalMs");
    expect(source).toContain("window.setInterval(save, AUTO_SAVE_INTERVAL_MS)");
    expect(source).not.toContain("window.setInterval(save, 1500)");
  });
});
