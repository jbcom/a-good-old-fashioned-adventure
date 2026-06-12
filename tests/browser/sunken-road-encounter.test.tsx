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

async function pressNearCourier(governor: PlayerGovernor) {
  const points = [
    [690, 336],
    [720, 336],
    [732, 360],
    [656, 360],
  ] as const;
  for (const [x, y] of points) {
    await governor.reachPoint(x, y, { tolerance: 20, maxSteps: 28 });
    await governor.press("a");
    await wait(100);
    if (governor.perceive().dialogueText.includes("Celia Knotwell")) return;
  }
  throw new Error(`Celia Knotwell dialogue did not open: ${governor.perceive().dialogueText}`);
}

it("meets the moving Sunken Road courier through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:sunken-road",
    playerX: 620,
    playerY: 336,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Take the courier warning",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T17:10:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Sunken Road");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Celia Knotwell");

  await pressNearCourier(governor);
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Celia Knotwell");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("ribbon-word");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/sunken-road-courier.png",
  });
  expect(desktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Celia Knotwell");

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/sunken-road-courier-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
}, 50_000);
