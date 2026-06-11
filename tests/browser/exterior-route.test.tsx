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

it("travels the S6 exterior road from village to castle approach through public controls", async () => {
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
    updatedAt: new Date("2026-06-11T05:00:00Z"),
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
  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Deep Forest" }, "right", {
    durationMs: 850,
    maxSteps: 80,
  });
  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Sunken Road" }, "right", {
    durationMs: 850,
    maxSteps: 80,
  });
  await governor.reachByDirection({ kind: "mapNameIncludes", text: "Castle Approach" }, "right", {
    durationMs: 850,
    maxSteps: 80,
  });

  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("Castle Approach");
}, 120_000);
