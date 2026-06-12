import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { App } from "../../src/app/App";
import { MemorySaveRepository } from "../../src/persistence/saveRepository";
import { PlayerGovernor } from "../harness/playerGovernor";
import type { GovernorPlanStep, PlayerPerception } from "../harness/playerGovernorModel";
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

function near(x: number, y: number, tolerance: number) {
  return (perception: PlayerPerception) => {
    const dx = x - (perception.diagnostics?.x ?? 0);
    const dy = y - (perception.diagnostics?.y ?? 0);
    return Math.abs(dx) <= tolerance && Math.abs(dy) <= tolerance;
  };
}

it("reads the tavern board questlet and follows up with Merrin through public controls", async () => {
  await page.viewport(1280, 720);
  await wait(100);

  const repository = new MemorySaveRepository();
  await repository.upsertSlot({
    id: 1,
    classId: "ranger",
    mapId: "map:village",
    playerX: 620,
    playerY: 220,
    level: 1,
    hp: 100,
    maxHp: 100,
    questSummary: "Read the tavern board",
    snapshotJson: "{}",
    updatedAt: new Date("2026-06-11T14:00:00Z"),
  });

  mountApp(repository);
  const governor = new PlayerGovernor();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await governor.click("continue-button");
  await expect.poll(() => governor.perceive().mapName).toBe("Hearthwake Village");

  const enterTavern: GovernorPlanStep[] = [
    {
      id: "enter-tavern",
      goal: { kind: "mapNameIncludes", text: "Unfurled Vine" },
      actions: [
        {
          id: "walk-to-tavern-door",
          kind: "reachPoint",
          x: 704,
          y: 220,
          tolerance: 22,
          maxSteps: 24,
          cost: 1,
        },
      ],
    },
  ];
  await governor.runPlan(enterTavern, { maxSteps: 8 });
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Read the hearth-song");

  await governor.runPlan(
    [
      {
        id: "read-board",
        goal: { kind: "dialogueIncludes", text: "Hearth-Song Board" },
        actions: [
          {
            id: "walk-to-board",
            kind: "reachPoint",
            x: 224,
            y: 112,
            tolerance: 18,
            maxSteps: 28,
            cost: 1,
            when: (perception) => !near(224, 112, 20)(perception),
          },
          {
            id: "press-a-near-board",
            kind: "press",
            button: "a",
            cost: 2,
            when: near(224, 112, 20),
          },
        ],
      },
    ],
    { maxSteps: 8 },
  );

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Hearth-Song Board");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Ask Merrin");
  const boardPath = await page.screenshot({
    path: "../../docs/evidence/tavern-questlet-board.png",
  });
  expect(boardPath).toBeTruthy();
  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).toHaveTextContent("Ask Merrin");

  await governor.runPlan(
    [
      {
        id: "ask-merrin",
        goal: { kind: "dialogueIncludes", text: "Merrin Underbough" },
        actions: [
          {
            id: "walk-to-merrin",
            kind: "reachPoint",
            x: 224,
            y: 152,
            tolerance: 18,
            maxSteps: 28,
            cost: 1,
            when: (perception) => !near(224, 152, 20)(perception),
          },
          {
            id: "press-a-near-merrin",
            kind: "press",
            button: "a",
            cost: 2,
            when: near(224, 152, 20),
          },
        ],
      },
    ],
    { maxSteps: 8 },
  );

  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("Merrin Underbough");
  await expect.element(page.getByTestId("dialogue-box")).toHaveTextContent("two promises");
  await page.viewport(390, 844);
  await wait(250);
  const phonePath = await page.screenshot({
    path: "../../docs/evidence/tavern-questlet-phone.png",
  });
  expect(phonePath).toBeTruthy();
  await page.viewport(1280, 720);
  await governor.press("a");
  await expect.element(page.getByTestId("quest-log")).not.toHaveTextContent("Ask Merrin");
}, 60_000);
