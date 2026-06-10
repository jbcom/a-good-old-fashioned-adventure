import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { page } from "vitest/browser";
import { PixiSpike } from "../../src/spikes/PixiSpike";
import { R3fSpike } from "../../src/spikes/R3fSpike";

let container: HTMLDivElement | undefined;
let root: Root | undefined;

function mount(node: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  root.render(<StrictMode>{node}</StrictMode>);
}

afterEach(() => {
  root?.unmount();
  container?.remove();
  container = undefined;
});

async function waitReady() {
  await expect
    .poll(() => container?.querySelector<HTMLCanvasElement>("canvas[data-ready='1']"), {
      timeout: 10_000,
    })
    .toBeTruthy();
  // settle a few frames so the first real render is on screen
  await new Promise((resolve) => setTimeout(resolve, 400));
}

it("pixi 2D spike renders the overworld slice", async () => {
  mount(<PixiSpike />);
  await waitReady();
  const path = await page.screenshot({ path: "spike-pixi.png" });
  expect(path).toBeTruthy();
});

it("r3f 2.5D spike renders the overworld slice", async () => {
  mount(<R3fSpike />);
  await waitReady();
  const path = await page.screenshot({ path: "spike-r3f.png" });
  expect(path).toBeTruthy();
});
