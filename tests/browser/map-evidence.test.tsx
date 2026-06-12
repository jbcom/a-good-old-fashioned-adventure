import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { maps } from "../../src/lib/content/registry";
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

function unmountApp() {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
}

it("captures per-map experience evidence for every map", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  for (const map of maps.values()) {
    const repository = new MemorySaveRepository();
    await repository.upsertSlot({
      id: 1,
      classId: "knight",
      mapId: map.id,
      playerX: map.playerSpawn.x,
      playerY: map.playerSpawn.y,
      level: 1,
      hp: 100,
      maxHp: 100,
      questSummary: `Surveying ${map.name}`,
      snapshotJson: "{}",
      updatedAt: new Date("2026-06-12T09:00:00Z"),
    });

    mountApp(repository);
    await expect.element(page.getByTestId("landing-screen")).toBeVisible();
    await page.getByTestId("continue-button").click();
    await expect
      .poll(
        () => (page.getByTestId("game-shell").element() as HTMLElement | null)?.dataset.mapId ?? "",
        { timeout: 10_000 },
      )
      .toBe(map.id);
    await wait(450);

    const slug = map.id.replace("map:", "");
    const shot = await page.screenshot({ path: `../../docs/evidence/maps/${slug}.png` });
    expect(shot, map.id).toBeTruthy();
    unmountApp();
    await wait(60);
  }
}, 240_000);
