import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../../src/app/App";
import { SAVE_DB_NAME } from "../../src/persistence/migrations";
import { getSaveRepository, setSaveRepositoryForTests } from "../../src/persistence/saveRepository";

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let originalBodyStyle = "";

async function closeRealSaveConnection() {
  const { CapacitorSQLite } = await import("@capacitor-community/sqlite");
  try {
    await CapacitorSQLite.closeConnection({ database: SAVE_DB_NAME });
  } catch {
    // The connection may already be closed when a test fails before initialization.
  }
}

afterEach(async () => {
  root?.unmount();
  container?.remove();
  document.body.setAttribute("style", originalBodyStyle);
  root = undefined;
  container = undefined;
  await closeRealSaveConnection();
  setSaveRepositoryForTests(null);
});

function mountProductionApp() {
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
      <App />
    </StrictMode>,
  );
}

it("persists a web save through Capacitor SQLite and restores it from Continue", async () => {
  setSaveRepositoryForTests(null);
  const input = userEvent.setup();

  mountProductionApp();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await input.keyboard("j");
  await expect.element(page.getByTestId("title-screen")).toBeVisible();
  await input.keyboard("j");
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();

  await expect
    .poll(
      async () => {
        const slot = await getSaveRepository().latestSlot();
        return slot ? `${slot.classId}:${slot.mapId}` : "";
      },
      { timeout: 10_000 },
    )
    .toBe("knight:map:overworld");

  root?.unmount();
  root = undefined;
  await closeRealSaveConnection();
  setSaveRepositoryForTests(null);

  mountProductionApp();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await expect.element(page.getByTestId("continue-button")).toBeEnabled();
  await expect.element(page.getByTestId("save-line")).toHaveTextContent("knight");

  await userEvent.click(page.getByTestId("continue-button"));
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  const shell = page.getByTestId("game-shell").element() as HTMLElement;
  expect(shell.dataset.classId).toBe("knight");
  expect(shell.dataset.mapId).toBe("map:overworld");
});
