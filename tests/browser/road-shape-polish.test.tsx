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

it("enters Oldwood and captures the first roadside landmark cluster through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:village",
    playerX: 800,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Take the east road",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T12:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Village");

  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Oldwood Forest" }, "right", {
    durationMs: 420,
    maxSteps: 12,
  });
  await governor.reachPoint(260, 304, { tolerance: 18, maxSteps: 24 });
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("Oldwood Forest");

  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/oldwood-road-polish.png",
  });
  expect(desktopPath).toBeTruthy();

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/oldwood-road-polish-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
});
