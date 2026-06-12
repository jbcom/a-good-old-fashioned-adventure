import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  root?.unmount();
  container?.remove();
  document.body.setAttribute("style", originalBodyStyle);
  root = undefined;
  container = undefined;
});

function mountApp(repository: MemorySaveRepository) {
  originalBodyStyle = document.body.getAttribute("style") ?? "";
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

async function pressNearLanternKeeper(governor: PlayerGovernor) {
  const points = [
    [848, 300],
    [884, 300],
    [904, 324],
    [832, 324],
  ] as const;
  for (const [x, y] of points) {
    await governor.reachPoint(x, y, { tolerance: 22, maxSteps: 32 });
    await governor.press("a");
    await wait(120);
    if (governor.perceive().dialogueText.includes("Caddoc Wick")) return;
  }
  throw new Error(`Caddoc Wick dialogue did not open: ${governor.perceive().dialogueText}`);
}

async function pressNearWreckPicker(governor: PlayerGovernor) {
  const points = [
    [176, 296],
    [216, 296],
    [216, 320],
    [160, 320],
  ] as const;
  for (const [x, y] of points) {
    await governor.reachPoint(x, y, { tolerance: 22, maxSteps: 32 });
    await governor.press("a");
    await wait(120);
    if (governor.perceive().dialogueText.includes("Petch Marrow")) return;
  }
  throw new Error(`Petch Marrow dialogue did not open: ${governor.perceive().dialogueText}`);
}

it("turns Oldwood's last-lantern window into a public-control route verb", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:oldwood-forest",
    playerX: 760,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Meet the last lantern keeper",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T19:20:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Oldwood Forest");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Caddoc Wick");

  await governor.reachPoint(848, 300, { tolerance: 22, maxSteps: 32 });
  await pressNearLanternKeeper(governor);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Caddoc Wick");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("last lantern");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/oldwood-lantern-budget.png",
  });
  expect(desktopPath).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/oldwood-lantern-budget-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);

  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Caddoc Wick");
}, 50_000);

it("turns the sunken wash wreck window into a public-control route verb", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:sunken-road",
    playerX: 96,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Meet the wreck picker",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T19:20:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Sunken Road");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Petch Marrow");

  await governor.reachPoint(176, 296, { tolerance: 22, maxSteps: 32 });
  await pressNearWreckPicker(governor);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Petch Marrow");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("wreck");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/sunken-wash-salvage.png",
  });
  expect(desktopPath).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/sunken-wash-salvage-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);

  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Petch Marrow");
}, 50_000);

it("frames the Deep Forest threshold props after removing open-space reliance", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:deep-forest",
    playerX: 900,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Read the tended threshold",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T19:25:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Deep Forest");

  await governor.reachPoint(980, 312, { tolerance: 24, maxSteps: 32 });
  await wait(300);
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/deep-forest-threshold-budget.png",
  });
  expect(desktopPath).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/deep-forest-threshold-budget-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
}, 45_000);
