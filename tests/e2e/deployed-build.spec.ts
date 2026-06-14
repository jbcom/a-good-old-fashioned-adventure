import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";

/**
 * The gate that would have caught the live GitHub Pages black-ground bug:
 * the built bundle, served under the project subpath, played with a real
 * browser under throttled network — the production-shaped conditions the
 * dev-server vitest tests never hit.
 */

/** Fraction of pixels in the ground band that aren't (near) black. */
function groundLitFraction(buffer: Buffer): number {
  const { width, height, data } = PNG.sync.read(buffer);
  const y0 = Math.floor(height * 0.45);
  const y1 = Math.floor(height * 0.7);
  let lit = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      total++;
      if (data[i] > 24 || data[i + 1] > 24 || data[i + 2] > 24) lit++;
    }
  }
  return lit / total;
}

test("deployed build: the game boots and the terrain renders (not black)", async ({
  page,
  context,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  const failedRequests: string[] = [];
  page.on("requestfailed", (r) => failedRequests.push(`${r.url()} (${r.failure()?.errorText})`));

  // throttle so the ground-bake-vs-asset-load race is real (the production bug):
  // the ground bakes at map mount before the large terrain PNG decodes.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  // a realistic slow connection (~1.5 Mbps) — fast enough to finish in the test
  // budget, slow enough that the ground bakes before the terrain PNG decodes
  // (the production race). Pathological throttles just make the test flaky.
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1500 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });

  await page.goto("./", { waitUntil: "load" });
  await page.getByRole("button", { name: /new game/i }).click();
  await page.waitForSelector("canvas[data-ready='1']", { timeout: 60_000 });

  // the ground recomposes only once EVERY sheet image has decoded
  // (preloadSheetImages awaits Promise.all), so wait for the network to settle —
  // not just the terrain PNG — then give the frame loop a moment to recompose.
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  const canvas = page.locator("canvas[data-ready='1']");

  // poll the rendered ground until it heals (or fail after a generous budget) —
  // proves the self-healing recompose fires, not just that it eventually could
  let lit = 0;
  await expect
    .poll(
      async () => {
        lit = groundLitFraction(await canvas.screenshot());
        return lit;
      },
      { timeout: 20_000, intervals: [500] },
    )
    .toBeGreaterThan(0.5);

  expect(failedRequests, "no asset should fail to load on the deployed subpath").toEqual([]);
  expect(consoleErrors, "the deployed build should boot with zero console errors").toEqual([]);
});
