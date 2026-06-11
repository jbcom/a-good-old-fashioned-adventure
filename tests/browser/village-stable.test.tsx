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

it("enters the Hearthwake stable yard and talks through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:village",
    playerX: 120,
    playerY: 344,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Visit the stable yard",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T13:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Village");

  await governor.reachPoint(112, 416, {
    tolerance: 24,
    maxSteps: 26,
    stopGoal: { kind: "mapNameIncludes", text: "Stable Yard" },
  });
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("Stable Yard");

  await governor.reachPoint(208, 160, { tolerance: 20, maxSteps: 24 });
  const desktopPath = await page.screenshot({ path: "../../docs/evidence/village-stable.png" });
  expect(desktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Oswin Hayward");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("saddle-bells");
  await governor.press("a");

  await expect.element(page.getByTestId("shop-panel")).toBeVisible();
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("Oswin's Feed Pail");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("A Buy");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("B Sell");

  const serviceDesktopPath = await page.screenshot({
    path: "../../docs/evidence/village-stable-service.png",
  });
  expect(serviceDesktopPath).toBeTruthy();

  await governor.press("a");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 8");
  await expect.element(page.getByTestId("shop-inventory-item:oat-bundle")).toHaveTextContent("x1");

  await governor.press("b");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 10");
  await expect.element(page.getByTestId("shop-inventory-item:oat-bundle")).toHaveTextContent("x0");

  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({ path: "../../docs/evidence/village-stable-phone.png" });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
  await governor.click("shop-close");
  expect(document.querySelector('[data-testid="shop-panel"]')).toBeNull();

  await governor.reachPoint(224, 292, {
    tolerance: 28,
    maxSteps: 24,
    stopGoal: { kind: "mapNameIncludes", text: "Hearthwake Village" },
  });
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("Hearthwake Village");

  await governor.reachPoint(620, 304, { tolerance: 24, maxSteps: 36 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Page Pip");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Oswin's oats");
  const consequencePath = await page.screenshot({
    path: "../../docs/evidence/village-stable-consequence.png",
  });
  expect(consequencePath).toBeTruthy();

  await governor.press("a");
  await governor.reachPoint(864, 304, {
    tolerance: 28,
    maxSteps: 28,
    stopGoal: { kind: "mapNameIncludes", text: "Oldwood Forest" },
  });
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("Oldwood Forest");

  await governor.reachPoint(304, 292, { tolerance: 24, maxSteps: 36 });
  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Oldwood Roadward");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("blue oat-string");
  const routePayoffPath = await page.screenshot({
    path: "../../docs/evidence/route-stable-payoff.png",
  });
  expect(routePayoffPath).toBeTruthy();
}, 60_000);
