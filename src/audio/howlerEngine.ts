/**
 * The game's audio engine: howler.js playing the purchased library
 * (src/config/audio.json — user mandate 2026-06-12: full switch from
 * ToneJS/procedural synthesis to real samples). Three channels:
 *   - music: one looping theme at a time, fade-swapped on setTheme
 *   - ambient: the theme's environmental bed, layered under the music
 *   - sfx: fire-and-forget cues (howler natively overlaps plays)
 * Howls are created lazily per path and cached for the engine's lifetime.
 */
import { Howl, Howler } from "howler";
import { audio } from "../lib/config";

/** Audio engine debug snapshot: label, ready state, mute status, theme, sfx count. */
export interface AudioDebugState {
  label: string;
  ready: boolean;
  muted: boolean;
  theme: string;
  sfxPlayed: number;
}

/** Game audio engine: music/ambient fade-swap and fire-and-forget SFX via howler.js. */
export interface GameAudioEngine {
  resumeFromGesture(): Promise<void>;
  setTheme(theme: string): void;
  playSfx(id: string): void;
  setMuted(muted: boolean): void;
  debugState(): AudioDebugState;
  dispose(): void;
}

const asset = (path: string) => `/assets/${path}`;

/** Build the howler-backed game audio engine (music, sfx, fades, mute). */
export function createGameAudioEngine(): GameAudioEngine {
  const howls = new Map<string, Howl>();
  const fadeTimers = new Set<ReturnType<typeof setTimeout>>();
  let theme = "";
  let muted = false;
  let sfxPlayed = 0;
  let music: Howl | null = null;
  let ambient: Howl | null = null;
  let disposed = false;

  function howlFor(path: string, opts: { loop: boolean; volume: number }): Howl {
    let howl = howls.get(path);
    if (!howl) {
      howl = new Howl({ src: [asset(path)], loop: opts.loop, volume: opts.volume, html5: false });
      howls.set(path, howl);
    }
    return howl;
  }

  function swapChannel(
    current: Howl | null,
    path: string | undefined,
    volume: number,
  ): Howl | null {
    if (current) {
      current.fade(current.volume(), 0, audio.volumes.themeFadeMs);
      const fading = current;
      const timer = setTimeout(() => {
        fadeTimers.delete(timer);
        // dispose() may have unloaded everything mid-fade
        if (!disposed) fading.stop();
      }, audio.volumes.themeFadeMs);
      fadeTimers.add(timer);
    }
    if (!path) return null;
    const next = howlFor(path, { loop: true, volume });
    next.volume(0);
    next.play();
    next.fade(0, volume, audio.volumes.themeFadeMs);
    return next;
  }

  return {
    async resumeFromGesture() {
      // howler unlocks its AudioContext on the first user gesture; nudge it
      const ctx = Howler.ctx;
      if (ctx && ctx.state === "suspended") await ctx.resume();
    },
    setTheme(nextTheme: string) {
      if (disposed || theme === nextTheme) return;
      theme = nextTheme;
      const musicMap = audio.music as Record<string, string | undefined>;
      const ambientMap = audio.ambient as Record<string, string | undefined>;
      music = swapChannel(music, musicMap[nextTheme], audio.volumes.music);
      ambient = swapChannel(ambient, ambientMap[nextTheme], audio.volumes.ambient);
    },
    playSfx(id: string) {
      if (disposed) return;
      const path = (audio.sfx as Record<string, string | undefined>)[id];
      // an unmapped cue is a content bug — fail loud in dev, silent in prod
      if (!path) {
        if (import.meta.env.DEV) throw new Error(`unmapped sfx id: ${id}`);
        return;
      }
      howlFor(path, { loop: false, volume: audio.volumes.sfx }).play();
      sfxPlayed += 1;
    },
    setMuted(next: boolean) {
      muted = next;
      Howler.mute(next);
    },
    debugState() {
      return {
        label: "howler",
        ready: Howler.ctx ? Howler.ctx.state === "running" : false,
        muted,
        theme,
        sfxPlayed,
      };
    },
    dispose() {
      disposed = true;
      for (const timer of fadeTimers) clearTimeout(timer);
      fadeTimers.clear();
      // Howler.mute is process-global — a muted engine must not silence
      // the next engine instance (strict mode remounts, HMR, tests)
      Howler.mute(false);
      for (const howl of howls.values()) howl.unload();
      howls.clear();
      music = null;
      ambient = null;
    },
  };
}
