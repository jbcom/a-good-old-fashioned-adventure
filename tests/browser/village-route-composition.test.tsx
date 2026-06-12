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

it("reads the Hearthwake letter-basket and changes Page Pip's line through public controls", async () => {
  await page.viewport(1280, 720);
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:village",
    playerX: 560,
    playerY: 272,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Read the letter basket",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T13:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();

  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().diagnostics?.mapId).toBe("map:village");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("letter-basket");

  await governor.reachPoint(600, 268, { tolerance: 12, maxSteps: 60 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Doorstep Letter");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("letter-basket");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/village-letter-basket.png",
  });
  expect(desktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("letter-basket");
  await governor.reachPoint(620, 304, { tolerance: 20, maxSteps: 40 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Page Pip");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("letter-basket");

  await page.viewport(390, 844);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/village-letter-basket-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
});
