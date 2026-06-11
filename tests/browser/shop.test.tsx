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

it("buys and sells at Brindle's counter through public movement and A/B input", async () => {
  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "knight",
    mapId: "map:village-shop",
    playerX: 192,
    playerY: 196,
    level: 1,
    hp: 50,
    maxHp: 100,
    questSummary: "Visit the keeper",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T05:30:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Shop");

  await governor.reachPoint(192, 160, { tolerance: 20 });
  await governor.press("a");

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Keeper Brindle");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("travel cake");

  await governor.press("a");
  await expect.poll(() => governor.perceive().diagnostics?.hp).toBe(75);

  await governor.press("a");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Prices");
  await governor.press("a");

  await expect.element(page.getByTestId("shop-panel")).toBeVisible();
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("Brindle's Counter");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("A Buy");
  await expect.element(page.getByTestId("shop-panel")).toHaveTextContent("B Sell");

  await governor.hold("down", 80);
  await expect
    .element(page.getByTestId("shop-row-mending-plaster"))
    .toHaveAttribute("aria-selected", "true");
  await governor.hold("up", 80);
  await expect
    .element(page.getByTestId("shop-row-travel-cake"))
    .toHaveAttribute("aria-selected", "true");

  await governor.press("a");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 6");
  await expect.element(page.getByTestId("shop-inventory-item:travel-cake")).toHaveTextContent("x1");

  await governor.press("b");
  await expect.element(page.getByTestId("top-hud")).toHaveTextContent("G 9");
  await expect.element(page.getByTestId("shop-inventory-item:travel-cake")).toHaveTextContent("x0");
});
