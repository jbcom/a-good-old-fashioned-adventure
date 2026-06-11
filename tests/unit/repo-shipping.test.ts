import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("shipping repository documents", () => {
  it("keeps standard repo docs current and scaffold-aware", () => {
    for (const path of [
      "AGENTS.md",
      "STANDARDS.md",
      "CHANGELOG.md",
      "TESTING.md",
      "DEPLOYMENT.md",
      "STATE.md",
      "README.md",
    ]) {
      expect(statSync(resolve(process.cwd(), path)).isFile()).toBe(true);
    }
    expect(read("AGENTS.md")).not.toContain("pre-scaffold");
    expect(read("README.md")).toContain("pnpm test:browser");
    expect(read("TESTING.md")).toContain("./gradlew :app:assembleDebug");
    expect(read("DEPLOYMENT.md")).toContain("release-please");
    expect(read("STATE.md")).toContain("Capacitor Android scaffold");
  });
});

describe("CI and release automation", () => {
  it("runs lint, typecheck, unit, browser, web build, cap sync, and APK assemble in CI", () => {
    const workflow = read(".github/workflows/ci.yml");
    for (const command of [
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm test:browser",
      "pnpm build",
      "pnpm cap:sync",
      "./gradlew :app:assembleDebug",
    ]) {
      expect(workflow).toContain(command);
    }
    expect(workflow).toContain("CI: true");
    expect(workflow).toContain("runs-on: macos-latest");
    expect(workflow).toContain('VITEST_BROWSER_HEADLESS: "false"');
    expect(workflow).toContain("pnpm exec playwright install chromium");
    expect(workflow).toContain("actions/upload-artifact");
    expect(workflow).toContain("android/app/build/outputs/apk/debug/*.apk");
  });

  it("runs browser groups with CLI-level serialization flags", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    for (const script of [pkg.scripts["test:browser:core"], pkg.scripts["test:browser:journey"]]) {
      expect(script).toContain("--browser.fileParallelism=false");
      expect(script).toContain("--no-file-parallelism");
    }
  });

  it("configures release-please in manifest mode for package and changelog updates", () => {
    const workflow = read(".github/workflows/release-please.yml");
    const config = JSON.parse(read("release-please-config.json"));
    const manifest = JSON.parse(read(".release-please-manifest.json"));
    expect(workflow).toContain("googleapis/release-please-action");
    expect(workflow).toContain("release-please-config.json");
    expect(config.packages["."]["release-type"]).toBe("node");
    expect(config.packages["."]["changelog-path"]).toBe("CHANGELOG.md");
    expect(config.packages["."]["extra-files"]).toContain("package.json");
    expect(manifest["."]).toBe("0.0.0");
  });
});
