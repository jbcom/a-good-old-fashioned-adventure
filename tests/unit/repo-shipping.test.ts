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
    expect(read("CLAUDE.md")).not.toContain("pre-scaffold");
    expect(read("CLAUDE.md")).toContain(
      "Use `AGENTS.md` as the authoritative repository instruction file",
    );
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
    expect(workflow).not.toContain("feat/content-architecture");
    expect(workflow).toContain("pnpm exec playwright install chromium");
    expect(workflow).toContain("actions/upload-artifact");
    expect(workflow).toContain("android/app/build/outputs/apk/debug/*.apk");
  });

  it("ships versioned release artifacts with provenance from release.yml", () => {
    const workflow = read(".github/workflows/release.yml");
    expect(workflow).toContain("release:");
    expect(workflow).toContain("types: [published]");
    expect(workflow).toContain("workflow_dispatch");
    expect(workflow).toContain("pnpm build");
    expect(workflow).toContain("./gradlew :app:assembleDebug");
    expect(workflow).toContain("actions/attest-build-provenance");
    expect(workflow).toContain("gh release upload");
  });

  it("deploys the game to GitHub Pages from cd.yml on main pushes", () => {
    const workflow = read(".github/workflows/cd.yml");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("pnpm build");
    expect(workflow).toContain("actions/configure-pages");
    expect(workflow).toContain("actions/upload-pages-artifact");
    expect(workflow).toContain("actions/deploy-pages");
    // pages serves the project under a subpath: the bundle must be
    // relative-base
    expect(read("vite.config.ts")).toContain('base: "./"');
  });

  it("documents the ci to release to cd flow", () => {
    const deployment = read("DEPLOYMENT.md");
    expect(deployment).toContain("release.yml");
    expect(deployment).toContain("cd.yml");
    expect(deployment).toContain("GitHub Pages");
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

  it("keeps the native pixel-art authoring pipeline checked in", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["author:pixelart"]).toBe("node scripts/export-pixelart.mjs");
    expect(read("scripts/export-pixelart.mjs")).toContain(
      "scripts/aseprite/import-pixel-sheet.lua",
    );
    expect(read("scripts/aseprite/import-pixel-sheet.lua")).toContain("Sprite(payload.width");

    for (const basename of ["terrain", "characters", "route-props"]) {
      expect(
        statSync(resolve(process.cwd(), `src/content/pixelart/${basename}.pix`)).isFile(),
      ).toBe(true);
      expect(
        statSync(resolve(process.cwd(), `src/content/pixelart/${basename}.aseprite`)).isFile(),
      ).toBe(true);
      expect(
        statSync(resolve(process.cwd(), `src/content/pixelart/${basename}.png`)).isFile(),
      ).toBe(true);
    }
  });

  it("keeps review-driven runtime safeguards in config and renderer code", () => {
    expect(read("src/config/ui.json")).toContain("autosaveIntervalMs");
    expect(read("src/app/App.tsx")).toContain("ui.persistence.autosaveIntervalMs");
    expect(read("src/render/GameStage.tsx")).toContain("disposeGroundMesh");
    expect(read("src/render/GameStage.tsx")).toContain("uniforms.uMap");
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
    // release-please owns the version; the gate only checks manifest shape
    expect(manifest["."]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
