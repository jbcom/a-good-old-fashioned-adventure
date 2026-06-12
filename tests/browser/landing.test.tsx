import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
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

function mountApp(repository = new MemorySaveRepository()) {
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

it("opens on an errant storybook landing page before class select", async () => {
  mountApp();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await expect.element(page.getByTestId("landing-scroll")).toBeVisible();
  await expect.element(page.getByTestId("continue-button")).toBeDisabled();
  await userEvent.click(page.getByTestId("settings-button"));
  await expect.element(page.getByTestId("settings-panel")).toBeVisible();
  await wait(1300);
  const landingPath = await page.screenshot({ path: "landing-storybook.png" });
  expect(landingPath).toBeTruthy();
  await userEvent.click(page.getByTestId("new-game-button"));
  // rail command: New Game opens the field directly — toolbox up, no picker
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  await expect.element(page.getByTestId("unit-toolbox")).toBeVisible();
});

it("enables continue when a save slot exists", async () => {
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:castle-dungeon",
    playerX: 300,
    playerY: 220,
    level: 3,
    hp: 24,
    maxHp: 30,
    questSummary: "Free Princess Amber",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T02:00:00Z"),
  });
  mountApp(repository);
  await expect.element(page.getByTestId("continue-button")).toBeEnabled();
  await expect.element(page.getByTestId("save-line")).toHaveTextContent("ranger");
  await userEvent.click(page.getByTestId("continue-button"));
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  await expect.element(page.getByTestId("unit-toolbox")).toBeVisible();
  const shell = page.getByTestId("game-shell").element() as HTMLElement;
  expect(shell.dataset.mapId).toBe("map:castle-dungeon");
});
