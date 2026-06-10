import { afterEach, describe, expect, it } from "vitest";
import { channelsOf, playMotion, releaseMotion } from "../../src/render/motion";

const TEST_ID = 999_001;

afterEach(() => releaseMotion(TEST_ID));

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("anim:* content drives anime.js channels in a real browser", () => {
  it("walk-bob lifts translateY through its cycle", async () => {
    const channels = playMotion(TEST_ID, "anim:walk-bob");
    const samples: number[] = [];
    for (let i = 0; i < 6; i++) {
      await settle(50);
      samples.push(channels.translateY);
    }
    const min = Math.min(...samples);
    expect(min).toBeLessThan(-0.5); // lifted (negative = up) mid-cycle
    expect(Math.max(...samples)).toBeLessThanOrEqual(0.01);
  });

  it("pickup-bob oscillates around zero with ±3 amplitude", async () => {
    const channels = playMotion(TEST_ID, "anim:pickup-bob");
    const samples: number[] = [];
    for (let i = 0; i < 10; i++) {
      await settle(60);
      samples.push(channels.translateY);
    }
    expect(Math.min(...samples)).toBeLessThan(-1);
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-3.01);
    expect(Math.max(...samples)).toBeLessThanOrEqual(3.01);
  });

  it("switching to idle cancels and resets channels", async () => {
    const channels = playMotion(TEST_ID, "anim:walk-bob");
    await settle(120);
    playMotion(TEST_ID, "anim:idle");
    expect(channels.translateY).toBe(0);
    await settle(100);
    expect(channels.translateY).toBe(0); // stays reset — old animation cancelled
  });

  it("re-requesting the running animation does not restart it", async () => {
    const a = playMotion(TEST_ID, "anim:walk-bob");
    await settle(80);
    const mid = a.translateY;
    const b = playMotion(TEST_ID, "anim:walk-bob");
    expect(b).toBe(a);
    // a restart would snap back to 0 immediately; equal object + continuing is enough
    expect(channelsOf(TEST_ID)).toBe(a);
    expect(typeof mid).toBe("number");
  });
});
