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

it("meets the Deep Forest fern-mender through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:deep-forest",
    playerX: 128,
    playerY: 320,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Find the fern mender",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T16:20:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Deep Forest");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Linnet Fernwise");

  await governor.reachPoint(236, 320, { tolerance: 24, maxSteps: 28 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Linnet Fernwise");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("fern-lamps");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/deep-forest-fern-mender.png",
  });
  expect(desktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Linnet Fernwise");

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/deep-forest-fern-mender-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
}, 45_000);
