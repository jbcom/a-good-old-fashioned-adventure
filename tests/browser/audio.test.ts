import { describe, expect, it } from "vitest";
import { createGameAudioEngine } from "../../src/audio/howlerEngine";
import audio from "../../src/config/audio.json";

/**
 * The howler engine in a real browser: themes start and swap, cues play
 * and count, mute reaches the global mixer, and the sample map's files
 * actually load over HTTP from the dev server (a 404'd src would leave
 * the Howl in "unloaded" forever).
 */

function loaded(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // a one-off Audio element verifies the asset URL serves
    const el = document.createElement("audio");
    el.src = `/assets/${path}`;
    el.addEventListener("canplaythrough", () => resolve(), { once: true });
    el.addEventListener("error", () => reject(new Error(`failed to load ${path}`)), {
      once: true,
    });
    el.load();
  });
}

describe("howler engine (real browser)", () => {
  it("plays themes and cues without throwing, and counts sfx", () => {
    const engine = createGameAudioEngine();
    engine.setTheme("village");
    engine.playSfx("slash");
    engine.playSfx("interact");
    engine.setMuted(true);
    const state = engine.debugState();
    expect(state.label).toBe("howler");
    expect(state.theme).toBe("village");
    expect(state.muted).toBe(true);
    expect(state.sfxPlayed).toBe(2);
    engine.setTheme("dungeon");
    expect(engine.debugState().theme).toBe("dungeon");
    engine.dispose();
  });

  it("serves the mapped audio files over HTTP", async () => {
    // one per channel kind: a music theme, an ambient bed, an sfx cue
    await loaded(audio.music.village);
    await loaded(audio.ambient.dungeon);
    await loaded(audio.sfx.slash);
  }, 15_000);
});
