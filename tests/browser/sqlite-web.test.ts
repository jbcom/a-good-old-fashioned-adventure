import { Capacitor } from "@capacitor/core";
import { expect, it } from "vitest";
import { CapacitorSaveRepository } from "../../src/persistence/saveRepository";

it("persists save metadata through the real jeep-sqlite web store", async () => {
  expect(Capacitor.getPlatform()).toBe("web");
  const repository = new CapacitorSaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:castle-dungeon",
    playerX: 312,
    playerY: 224,
    level: 4,
    hp: 21,
    maxHp: 30,
    questSummary: "Free Princess Amber",
    snapshotJson: JSON.stringify({ test: "browser-sqlite" }),
    updatedAt: new Date("2026-06-11T03:30:00Z"),
  });

  await expect(repository.latestSlot()).resolves.toMatchObject({
    classId: "ranger",
    mapId: "map:castle-dungeon",
    playerX: 312,
    playerY: 224,
    level: 4,
  });
});
