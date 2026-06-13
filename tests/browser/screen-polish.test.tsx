import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { CommanderGovernor } from "../harness/commanderGovernor";
import { wait } from "../harness/wait";

/**
 * S20.4 screen polish evidence: the landing, results, gameover, and upgrade
 * screens captured at desktop and phone viewports so they can be READ against
 * the Errant Storybook bar (warm parchment, manuscript chrome, no POC default).
 */
let container: HTMLDivElement | undefined;
let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  container = undefined;
});

function mountApp(repository: MemorySaveRepository) {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  container = document.createElement("div");
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(
    <StrictMode>
      <App saveRepository={repository} />
    </StrictMode>,
  );
}

function richSave(repository: MemorySaveRepository) {
  return repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:rescue-route",
    playerX: 136,
    playerY: 976,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "The screens read",
    snapshotJson: JSON.stringify({
      coins: 1200,
      gems: 240,
      roses: 12,
      purchasedUpgradeIds: [
        "upgrade:first-vow",
        "upgrade:dragon-wake",
        "upgrade:unlock-forest-orc",
      ],
      unlockedClassIds: ["knight", "ranger", "wizard"],
      unlockedRoutePackIds: [],
      rescueCount: 1,
    }),
    updatedAt: new Date("2026-06-13T10:00:00Z"),
  });
}

it("captures the landing screen at both viewports", async () => {
  const repository = new MemorySaveRepository();
  await richSave(repository);
  await page.viewport(1280, 720);
  mountApp(repository);
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await wait(400);
  expect(await page.screenshot({ path: "../../docs/evidence/screen-landing.png" })).toBeTruthy();
  await page.viewport(390, 844);
  await wait(300);
  expect(
    await page.screenshot({ path: "../../docs/evidence/screen-landing-phone.png" }),
  ).toBeTruthy();
});

it("captures the gameover and upgrade screens", async () => {
  const repository = new MemorySaveRepository();
  await richSave(repository);
  await page.viewport(1280, 720);
  mountApp(repository);
  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");

  // results (a win via AUTO) → the upgrade graph; each sits on its parchment
  // panel (assert the panel node, not just the screenshot, so a class rename
  // that drops the parchment surface fails the gate)
  await commander.tap("hud-auto");
  await expect.poll(() => commander.perceive().mode, { timeout: 20_000 }).toBe("results");
  await expect.element(page.getByTestId("results-panel")).toBeVisible();
  await wait(400);
  expect(await page.screenshot({ path: "../../docs/evidence/screen-results.png" })).toBeTruthy();
  await commander.tap("open-upgrade-graph");
  await expect.element(page.getByTestId("upgrade-detail")).toBeVisible();
  await expect.element(page.getByTestId("upgrade-panel")).toBeVisible();
  await wait(400);
  expect(await page.screenshot({ path: "../../docs/evidence/screen-upgrade.png" })).toBeTruthy();
});

it("captures the gameover screen on its parchment panel", async () => {
  const repository = new MemorySaveRepository();
  await richSave(repository);
  await page.viewport(1280, 720);
  mountApp(repository);
  const commander = new CommanderGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await commander.tap("continue-button");
  await expect
    .poll(() => commander.perceive().mapName, { timeout: 10_000 })
    .toBe("map:rescue-route");
  // retire the run → gameover, which renders on the shared parchment end-panel
  await commander.tap("hud-menu");
  await commander.tap("retire-run");
  await expect.poll(() => commander.perceive().mode, { timeout: 5000 }).toBe("gameover");
  await expect.element(page.getByTestId("end-panel")).toBeVisible();
  await wait(400);
  expect(await page.screenshot({ path: "../../docs/evidence/screen-gameover.png" })).toBeTruthy();
});
