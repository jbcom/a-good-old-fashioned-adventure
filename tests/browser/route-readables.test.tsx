import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";
import type { GovernorPlanStep, PlayerPerception } from "../harness/playerGovernorModel";

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

function near(x: number, y: number, tolerance: number) {
  return (perception: PlayerPerception) => {
    const dx = x - (perception.diagnostics?.x ?? 0);
    const dy = y - (perception.diagnostics?.y ?? 0);
    return Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance;
  };
}

it("reads the Oldwood waystone through the player governor", async () => {
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
    questSummary: "Read the first Oldwood marker",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T15:00:00Z"),
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
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Read the mossy waystone");

  const plan: GovernorPlanStep[] = [
    {
      id: "read-oldwood-waystone",
      goal: { kind: "dialogueIncludes", text: "Mossy Waystone" },
      actions: [
        {
          id: "walk-to-waystone",
          kind: "reachPoint",
          x: 150,
          y: 292,
          tolerance: 18,
          maxSteps: 24,
          cost: 1,
          when: (perception) => !near(150, 292, 22)(perception),
        },
        {
          id: "press-a-near-waystone",
          kind: "press",
          button: "a",
          cost: 2,
          when: near(150, 292, 22),
        },
      ],
    },
  ];
  await governor.runPlan(plan, { maxSteps: 8 });
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Mossy Waystone");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Keep east");
  const desktopPath = await page.screenshot({
    path: "../../docs/evidence/route-readable-oldwood.png",
  });
  expect(desktopPath).toBeTruthy();
  await governor.press("a");
  await expect
    .element(page.getByTestId("quest-log"))
    .not.toHaveTextContent("Read the mossy waystone");
}, 45_000);

it("reads the Sunken Road cart ledger through the player governor", async () => {
  await page.viewport(390, 844);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:sunken-road",
    playerX: 180,
    playerY: 336,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Read the caravan ledger",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T15:05:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Sunken Road");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Read the splintered cart");

  const plan: GovernorPlanStep[] = [
    {
      id: "read-sunken-cart",
      goal: { kind: "dialogueIncludes", text: "Splintered Cart Ledger" },
      actions: [
        {
          id: "walk-to-cart",
          kind: "reachPoint",
          x: 230,
          y: 336,
          tolerance: 18,
          maxSteps: 24,
          cost: 1,
          when: (perception) => !near(230, 336, 22)(perception),
        },
        {
          id: "press-a-near-cart",
          kind: "press",
          button: "a",
          cost: 2,
          when: near(230, 336, 22),
        },
      ],
    },
  ];
  await governor.runPlan(plan, { maxSteps: 8 });
  await expect
    .element(page.getByTestId("dialogue-box"))
    .toHaveTextContent("Splintered Cart Ledger");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("water took the wheels");
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/route-readable-sunken-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await governor.press("a");
  await expect
    .element(page.getByTestId("quest-log"))
    .not.toHaveTextContent("Read the splintered cart");
  await page.viewport(1280, 720);
}, 45_000);
