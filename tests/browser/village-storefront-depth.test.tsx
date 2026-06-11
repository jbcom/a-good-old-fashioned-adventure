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

it("shows and trades at the Hearthwake road-cart storefront through public controls", async () => {
  await page.viewport(1280, 720);
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:village",
    playerX: 448,
    playerY: 304,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Visit the road cart",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T12:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();

  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().diagnostics?.mapId).toBe("map:village");
  await governor.reachPoint(528, 260, { tolerance: 12, maxSteps: 60 });

  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/village-road-cart-storefront.png",
  });
  expect(desktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Penny Cartwright");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("wayfarer ribbon");
  await governor.press("a");

  await expect.element(page.getByTestId("shop-panel")).toBeVisible();
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("Penny's Road Cart");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("A Buy");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("B Sell");

  await governor.press("a");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 10");
  await expect
    .element(page.getByTestId("shop-inventory-item:wayfarer-ribbon"))
    .toHaveTextContent("x1");

  await governor.press("b");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 11");
  await expect
    .element(page.getByTestId("shop-inventory-item:wayfarer-ribbon"))
    .toHaveTextContent("x0");

  await page.viewport(390, 844);
  await governor.click("shop-close");
  await governor.reachPoint(528, 260, { tolerance: 18, maxSteps: 20 });
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/village-road-cart-storefront-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
});
