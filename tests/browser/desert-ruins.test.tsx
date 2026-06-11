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

it("enters the Desert Ruins, reads the mural, and returns through public controls", async () => {
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:sunken-road",
    playerX: 512,
    playerY: 336,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Read the old road",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T09:10:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Sunken Road");

  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Desert Ruins" }, "up", {
    durationMs: 240,
    maxSteps: 12,
  });
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Desert Ruins");

  await governor.reachByDirection({ kind: "dialogueIncludes", text: "Pilgrim Safra" }, "up", {
    durationMs: 240,
    maxSteps: 12,
  });
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Pilgrim Safra");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("sunken road");
  await governor.press("a");

  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Sunken Road" }, "down", {
    durationMs: 240,
    maxSteps: 12,
  });
  await expect.poll(() => governor.perceive().mapName, { timeout: 10_000 }).toBe("Sunken Road");
}, 45_000);
