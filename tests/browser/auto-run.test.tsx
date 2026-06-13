import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { CommanderGovernor } from "../harness/commanderGovernor";
import { wait } from "../harness/wait";

/**
 * AUTO (docs/RAIL-COMMAND.md §AUTO): the top-bar control that plays the
 * frontier map headlessly and jumps straight to results — a win shows the
 * rescue results, a loss the gameover ledger. Either way it banks a farm.
 */
let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
});

it("AUTO plays the frontier headlessly and jumps to results", async () => {
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
      gems: 0,
      roses: 0,
      // already cleared a map once → AUTO is unlocked (a frontier exists)
      rescueCount: 1,
      purchasedUpgradeIds: ["upgrade:first-vow"],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-13T17:00:00Z"),
  });

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

  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // the AUTO button is present in the top bar
  await expect.element(page.getByTestId("hud-auto")).toBeVisible();

  // one tap auto-plays the frontier and lands on results or gameover
  await commander.tap("hud-auto");
  await expect
    .poll(() => commander.perceive().mode, { timeout: 10_000 })
    .toMatch(/results|gameover/);
}, 240_000);

it("hides AUTO until the player has cleared a map (a frontier exists)", async () => {
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
    // rescueCount 0 → no frontier yet → AUTO hidden
    snapshotJson: JSON.stringify({
      coins: 0,
      rescueCount: 0,
      purchasedUpgradeIds: ["upgrade:first-vow"],
      unlockedClassIds: ["knight"],
      unlockedRoutePackIds: [],
    }),
    updatedAt: new Date("2026-06-13T17:00:00Z"),
  });

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

  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // AUTO is absent before the first clear
  expect(document.querySelector('[data-testid="hud-auto"]')).toBeNull();
}, 240_000);
