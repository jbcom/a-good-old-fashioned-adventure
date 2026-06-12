import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";
import { wait } from "../harness/wait";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";

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

async function pressNearThorncutter(governor: PlayerGovernor) {
  const points = [
    [508, 288],
    [540, 288],
    [552, 312],
    [492, 312],
  ] as const;
  for (const [x, y] of points) {
    await governor.reachPoint(x, y, { tolerance: 20, maxSteps: 28 });
    await governor.press("a");
    await wait(100);
    if (governor.perceive().dialogueText.includes("Hester Briarhook")) return;
  }
  throw new Error(`Hester Briarhook dialogue did not open: ${governor.perceive().dialogueText}`);
}

it("meets the Oldwood thorncutter through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:oldwood-forest",
    playerX: 452,
    playerY: 288,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Meet the thorncutter",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T18:20:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Oldwood Forest");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Hester Briarhook");

  await governor.reachPoint(520, 292, { tolerance: 20, maxSteps: 32 });
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/oldwood-thorncutter-silhouette.png",
  });
  expect(desktopPath).toBeTruthy();

  await pressNearThorncutter(governor);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Hester Briarhook");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("hazel arch");
  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Hester Briarhook");

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/oldwood-thorncutter-silhouette-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
}, 50_000);

it("frames the Sunken Road upper silhouettes in headed browser evidence", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:sunken-road",
    playerX: 650,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Inspect the upper road silhouettes",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T18:25:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Sunken Road");
  await governor.reachPoint(690, 304, { tolerance: 20, maxSteps: 28 });

  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/sunken-road-upper-silhouettes.png",
  });
  expect(desktopPath).toBeTruthy();
}, 40_000);
