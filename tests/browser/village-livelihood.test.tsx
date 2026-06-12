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

it("walks to the Hearthwake livelihood cluster and talks through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:village",
    playerX: 220,
    playerY: 324,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Meet the village baker",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T11:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Village");

  await governor.reachPoint(252, 324, { tolerance: 18, maxSteps: 24 });
  await governor.press("a");

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Tamsin Hearth");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("bakery oven");
  const desktopPath = await page.screenshot({ path: "../../docs/evidence/village-livelihood.png" });
  expect(desktopPath).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/village-livelihood-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
});
