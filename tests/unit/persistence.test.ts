import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import drizzleConfig from "../../drizzle.config";
import { SAVE_DB_NAME, SAVE_MIGRATIONS } from "../../src/persistence/migrations";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { saveEvents, saveSlots } from "../../src/persistence/schema";
import viteConfig from "../../vite.config";

describe("save persistence architecture", () => {
  it("uses Drizzle schema as the save database source of truth", () => {
    expect(saveSlots.id.name).toBe("id");
    expect(saveEvents.eventType.name).toBe("event_type");
    expect(drizzleConfig.schema).toBe("./src/persistence/schema.ts");
    expect(drizzleConfig.dialect).toBe("sqlite");
  });

  it("ships runtime SQLite migrations and a local web wasm asset", () => {
    expect(SAVE_DB_NAME).toBe("good-old-fashioned-adventure");
    expect(SAVE_MIGRATIONS.join("\n")).toContain("CREATE TABLE IF NOT EXISTS save_slots");
    expect(SAVE_MIGRATIONS.join("\n")).toContain("CREATE TABLE IF NOT EXISTS save_events");
    expect(statSync(resolve(process.cwd(), "public/assets/sql-wasm.wasm")).size).toBeGreaterThan(
      100_000,
    );
  });

  it("pins sql.js and ships the matching wasm binary for jeep-sqlite", () => {
    const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
    const jeepPackageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "node_modules/jeep-sqlite/package.json"), "utf8"),
    );
    const source = resolve(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm");
    const target = resolve(process.cwd(), "public/assets/sql-wasm.wasm");
    const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(packageJson.dependencies["@capacitor-community/sqlite"]).toBe("8.1.0");
    expect(packageJson.dependencies["@capacitor/core"]).toBe("8.4.0");
    expect(packageJson.dependencies["@capacitor/preferences"]).toBe("8.0.1");
    expect(packageJson.dependencies["jeep-sqlite"]).toBe("2.8.0");
    expect(packageJson.dependencies["sql.js"]).toBe("1.11.0");
    expect(jeepPackageJson.dependencies["sql.js"]).toBe("^1.11.0");
    expect(sha256(target)).toBe(sha256(source));
  });

  it("keeps Dependabot from piecemeal-updating the pinned save stack", () => {
    const dependabot = readFileSync(resolve(process.cwd(), ".github/dependabot.yml"), "utf8");
    for (const dependencyName of [
      "@capacitor-community/sqlite",
      "@capacitor/android",
      "@capacitor/cli",
      "@capacitor/core",
      "@capacitor/device",
      "@capacitor/preferences",
      "jeep-sqlite",
      "sql.js",
    ]) {
      expect(dependabot).toContain(`dependency-name: "${dependencyName}"`);
    }
  });

  it("can upsert and read save metadata through the repository contract", async () => {
    const repository = new MemorySaveRepository();
    await repository.upsertSlot({
      id: 1,
      classId: "wizard",
      mapId: "map:overworld",
      playerX: 128,
      playerY: 256,
      level: 2,
      hp: 18,
      maxHp: 24,
      questSummary: "Cross the bridge",
      snapshotJson: "{}",
      updatedAt: new Date("2026-06-11T02:30:00Z"),
    });
    await repository.recordEvent({
      slotId: 1,
      eventType: "manual-save",
      payloadJson: "{}",
      createdAt: new Date("2026-06-11T02:31:00Z"),
    });
    await expect(repository.latestSlot()).resolves.toMatchObject({
      classId: "wizard",
      mapId: "map:overworld",
      playerX: 128,
      playerY: 256,
      level: 2,
    });
  });

  it("keeps SQLite web connection initialization HMR-safe without hiding other failures", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/persistence/saveRepository.ts"),
      "utf8",
    );
    expect(source).toContain("isExistingConnectionError");
    expect(source).toContain("if (!isExistingConnectionError(error)) throw error");
  });
});

describe("vite capacitor/sqlite configuration", () => {
  it("keeps wasm public assets and Capacitor dependencies explicit", () => {
    const config = viteConfig as {
      publicDir?: string;
      assetsInclude?: string[];
      optimizeDeps?: { include?: string[]; exclude?: string[] };
      build?: { target?: string };
    };
    expect(config.publicDir).toBe("public");
    expect(config.assetsInclude).toContain("**/*.wasm");
    expect(config.optimizeDeps?.include).toContain("@capacitor-community/sqlite");
    expect(config.optimizeDeps?.include).toContain("jeep-sqlite/loader");
    expect(config.optimizeDeps?.exclude).toContain("sql.js");
    expect(config.build?.target).toBe("es2022");
  });
});

describe("Capacitor SQLite repository resilience", () => {
  it("tolerates an existing SQLite connection during Vite HMR", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/persistence/saveRepository.ts"),
      "utf8",
    );

    expect(source).toContain("await CapacitorSQLite.createConnection");
    expect(source).toContain("Vite HMR can recreate this repository");
  });
});

describe("vitest browser configuration", () => {
  it("serializes browser spec files so public-control tests do not share the page", async () => {
    const { default: vitestConfig } = await import("../../vitest.config");
    const browserProject = (vitestConfig.test?.projects ?? [])
      .map((project) =>
        typeof project === "string"
          ? null
          : (project as {
              test?: {
                name?: string;
                fileParallelism?: boolean;
                browser?: { fileParallelism?: boolean };
              };
            }),
      )
      .find((project) => project?.test?.name === "browser");
    expect(browserProject?.test?.fileParallelism).toBe(false);
    expect(browserProject?.test?.browser?.fileParallelism).toBe(false);
  });
});
