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

async function startFromSave(save: {
  classId: string;
  mapId: string;
  playerX: number;
  playerY: number;
}) {
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "The road begins.",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T06:00:00Z"),
    ...save,
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  return governor;
}

it("talks to Page Pip through public movement and A-button input", async () => {
  const governor = await startFromSave({
    classId: "ranger",
    mapId: "map:village",
    playerX: 596,
    playerY: 304,
  });
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Village");

  await governor.hold("right", 280);
  await governor.press("a");

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Page Pip");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Keeper Brindle");
  const path = await page.screenshot({ path: "questline-page-dialogue.png" });
  expect(path).toBeTruthy();
});

it("talks to the Oldwood Hermit through public movement and A-button input", async () => {
  const governor = await startFromSave({
    classId: "knight",
    mapId: "map:oldwood-forest",
    playerX: 352,
    playerY: 292,
  });
  await expect.poll(() => governor.perceive().mapName).toBe("Oldwood Forest");

  await governor.hold("right", 340);
  await governor.press("a");

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Oldwood Hermit");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("raiders");
  const path = await page.screenshot({ path: "questline-hermit-dialogue.png" });
  expect(path).toBeTruthy();
});
