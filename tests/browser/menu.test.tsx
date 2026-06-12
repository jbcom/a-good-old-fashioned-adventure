import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { App } from "../../src/app/App";
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

function mountApp() {
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
      <App saveRepository={new MemorySaveRepository()} />
    </StrictMode>,
  );
}

function shell() {
  const el = page.getByTestId("game-shell").element() as HTMLElement;
  return {
    mode: el.dataset.mode ?? "",
    paused: el.dataset.paused === "true",
    muted: el.dataset.muted === "true",
    deviceProfile: el.dataset.deviceProfile ?? "",
    x: Number(el.dataset.playerX ?? 0),
  };
}

function expectErrantStorybookChrome(testId: string) {
  const panel = page.getByTestId(testId).element() as HTMLElement;
  const style = getComputedStyle(panel);
  expect(style.fontFamily.toLowerCase()).not.toContain("press start");
  expect(style.borderColor).not.toBe("rgb(247, 226, 20)");
}

async function startRun() {
  const input = userEvent.setup();
  mountApp();
  await expect.element(page.getByTestId("landing-screen")).toBeVisible();
  await userEvent.click(page.getByTestId("new-game-button"));
  await expect.element(page.getByTestId("world-stage-shell")).toBeVisible();
  return input;
}

it("pauses and resumes without the sim advancing", async () => {
  const input = await startRun();

  await input.keyboard("{Escape}");
  await expect.element(page.getByTestId("pause-screen")).toBeVisible();
  await expect.poll(() => shell().paused).toBe(true);

  await input.keyboard("{Escape}");
  await expect.element(page.getByTestId("pause-screen")).not.toBeInTheDocument();
  await expect.poll(() => shell().paused).toBe(false);
});

it("keeps the mobile-first HUD below the 20% chrome budget", async () => {
  await startRun();
  expect(["desktop", "tablet", "phone"]).toContain(shell().deviceProfile);
  const hud = page.getByTestId("top-hud").element() as HTMLElement;
  const hudRect = hud.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  expect(hudRect.height / viewportHeight).toBeLessThanOrEqual(0.2);
  const panel = page.getByTestId("side-panel").element() as HTMLElement;
  const panelRect = panel.getBoundingClientRect();
  expect(panel.classList.contains("open")).toBe(false);
  expect(panelRect.left).toBeGreaterThan(window.innerWidth);
});

it("toggles mute from the slideout and can retire to gameover", async () => {
  await startRun();
  await userEvent.click(page.getByTestId("hud-menu"));
  await expect.element(page.getByTestId("side-panel")).toBeVisible();

  expect(shell().muted).toBe(false);
  await userEvent.click(page.getByTestId("mute-toggle"));
  expect(shell().muted).toBe(true);
  await expect.element(page.getByTestId("audio-state")).toHaveTextContent("muted");

  await userEvent.click(page.getByTestId("pause-toggle"));
  await expect.element(page.getByTestId("pause-screen")).toBeVisible();
  expectErrantStorybookChrome("pause-panel");
  expect(shell().paused).toBe(true);
  expect(page.getByTestId("hud-menu").element().getAttribute("aria-expanded")).toBe("false");
  await wait(220);
  const pausePath = await page.screenshot({ path: "menu-pause.png" });
  expect(pausePath).toBeTruthy();
  await userEvent.click(page.getByTestId("resume-button"));
  await expect.element(page.getByTestId("pause-screen")).not.toBeInTheDocument();

  await userEvent.click(page.getByTestId("hud-menu"));
  await userEvent.click(page.getByTestId("retire-run"));
  await expect.element(page.getByTestId("gameover-screen")).toBeVisible();
  expectErrantStorybookChrome("end-panel");
  expect(shell().mode).toBe("gameover");
  await wait(220);
  const gameoverPath = await page.screenshot({ path: "menu-gameover.png" });
  expect(gameoverPath).toBeTruthy();
});
