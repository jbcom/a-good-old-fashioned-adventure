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

async function pressNearPilgrim(governor: PlayerGovernor) {
  const points = [
    [220, 304],
    [252, 304],
    [260, 328],
    [198, 328],
  ] as const;
  for (const [x, y] of points) {
    await governor.reachPoint(x, y, { tolerance: 20, maxSteps: 28 });
    await governor.press("a");
    await wait(100);
    if (governor.perceive().dialogueText.includes("Aveline Dustcoat")) return;
  }
  throw new Error(`Aveline Dustcoat dialogue did not open: ${governor.perceive().dialogueText}`);
}

it("turns the Castle Approach open stretch into a public-control encounter", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:castle-approach",
    playerX: 92,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Hear the approach warning",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T18:50:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Castle Approach");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Aveline Dustcoat");

  await governor.reachPoint(220, 304, { tolerance: 20, maxSteps: 32 });
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/castle-approach-pilgrim.png",
  });
  expect(desktopPath).toBeTruthy();

  await pressNearPilgrim(governor);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Aveline Dustcoat");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("gate wind");
  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Aveline Dustcoat");

  await governor.reachPoint(520, 264, { tolerance: 24, maxSteps: 44 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Mage Gwydion");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Aveline");

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/castle-approach-pilgrim-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
}, 50_000);
