import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { CommanderGovernor } from "../harness/commanderGovernor";
import { wait } from "../harness/wait";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
});

function mountApp(repository: MemorySaveRepository) {
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <App saveRepository={repository} />
    </StrictMode>,
  );
}

it("commands a rail run: deploy, push, bank, retire stronger", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:rescue-route",
    playerX: 136,
    playerY: 976,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Hold the road",
    snapshotJson: JSON.stringify({
      coins: 0,
      roses: 0,
      purchasedUpgradeIds: ["upgrade:first-vow"],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-12T17:00:00Z"),
  });

  mountApp(repository);
  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // the HUD shows all three currencies (coins, the dragon-hoard gems, roses)
  await expect.element(page.getByTestId("hud-coins")).toBeVisible();
  await expect.element(page.getByTestId("hud-gems")).toBeVisible();
  await expect.element(page.getByTestId("hud-roses")).toBeVisible();

  // one gesture starts the war: the knight lands, the first wave answers
  await commander.deploy("knight");
  await expect.poll(() => commander.perceive().units, { timeout: 5000 }).toBe(1);
  await expect.poll(() => commander.perceive().enemies, { timeout: 8000 }).toBeGreaterThan(0);

  // the line pays its way: kills and checkpoints bank while we watch
  const coins0 = commander.perceive().coins;
  await expect.poll(() => commander.perceive().coins, { timeout: 45_000 }).toBeGreaterThan(coins0);

  // the front advances north as the knight clears the road
  const front0 = commander.perceive().frontY;
  await expect
    .poll(() => commander.perceive().frontY, { timeout: 45_000 })
    .toBeLessThan(front0 - 24);

  const pushShot = await page.screenshot({
    path: "../../docs/evidence/rail-run-push.png",
  });
  expect(pushShot).toBeTruthy();

  // retire the line: the banked coins survive into the ledger and the DAG
  await commander.tap("hud-menu");
  await commander.tap("retire-run");
  await expect.poll(() => commander.perceive().mode, { timeout: 5000 }).toBe("gameover");
  const banked = commander.perceive().coins;
  expect(banked).toBeGreaterThan(coins0);
}, 240_000);
