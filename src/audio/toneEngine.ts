import * as Tone from "tone";
import audio from "../config/audio.json";

interface RampPoint {
  t: number;
  v: number;
  ramp?: "exp";
}

interface SfxRecipe {
  osc: string;
  freq?: RampPoint[];
  gain?: RampPoint[];
  duration?: number;
  arpeggio?: {
    notes: number[];
    stepTime: number;
    noteGain: number;
    noteDecay: number;
  };
  sequence?: {
    notes: number[];
    durations: number[];
    noteGain: number;
  };
}

export interface AudioDebugState {
  label: string;
  ready: boolean;
  muted: boolean;
  theme: string;
  sfxPlayed: number;
}

export interface ToneAudioEngine {
  resumeFromGesture(): Promise<void>;
  setTheme(theme: string): void;
  playSfx(id: string): void;
  setMuted(muted: boolean): void;
  debugState(): AudioDebugState;
  dispose(): void;
}

const SFX_POOL_SIZE = 8;

interface PooledSynth {
  synth: Tone.Synth;
  busyUntil: number;
}

function createPooledSynth(output: Tone.Volume, osc: string): PooledSynth {
  const synth = new Tone.Synth({
    oscillator: { type: osc as never },
    envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.12 },
    volume: Tone.gainToDb(0.0001),
  }).connect(output);
  return { synth, busyUntil: 0 };
}

function scheduleRamp(
  signal: Tone.Signal<"frequency"> | Tone.Param<"gain">,
  points: RampPoint[] | undefined,
  now: number,
) {
  if (!points?.length) return;
  signal.setValueAtTime(points[0].v, now + points[0].t);
  for (const point of points.slice(1)) {
    const at = now + point.t;
    if (point.ramp === "exp") signal.exponentialRampToValueAtTime(Math.max(0.0001, point.v), at);
    else signal.linearRampToValueAtTime(point.v, at);
  }
}

export function createToneAudioEngine(): ToneAudioEngine {
  const output = new Tone.Volume(-6).toDestination();
  const bgmSynth = new Tone.Synth({
    oscillator: { type: audio.bgm.osc as never },
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.16 },
    volume: Tone.gainToDb(Math.max(0.0001, audio.bgm.noteGain)),
  }).connect(output);

  let ready = false;
  let muted = false;
  let theme = "";
  let sfxPlayed = 0;
  let bgmTimer: number | null = null;
  let bgmIndex = 0;
  let disposed = false;
  const sfxPools = new Map<string, PooledSynth[]>();

  function stopLoop() {
    if (bgmTimer !== null) window.clearInterval(bgmTimer);
    bgmTimer = null;
    bgmIndex = 0;
  }

  let lastBgmTime = 0;
  function playBgmStep(notes: number[]) {
    if (disposed || !notes.length) return;
    const note = notes[bgmIndex % notes.length];
    bgmIndex += 1;
    // Tone asserts start times strictly increase; rapid remounts can land
    // two steps in the same audio frame, so nudge past the previous note
    const at = Math.max(Tone.now() + 0.02, lastBgmTime + 1e-3);
    lastBgmTime = at;
    bgmSynth.triggerAttackRelease(note, audio.bgm.noteDuration, at);
  }

  function startLoop() {
    if (disposed || !ready || bgmTimer !== null) return;
    const notes = audio.bgm.themes[theme as keyof typeof audio.bgm.themes];
    if (!notes?.length) return;
    playBgmStep(notes);
    bgmTimer = window.setInterval(() => playBgmStep(notes), audio.bgm.stepMs);
  }

  function triggerPooledSfxNote(
    osc: string,
    freq: number,
    gain: number,
    duration: number,
    at: number,
  ) {
    let pool = sfxPools.get(osc);
    if (!pool) {
      pool = Array.from({ length: SFX_POOL_SIZE }, () => createPooledSynth(output, osc));
      sfxPools.set(osc, pool);
    }
    const now = Tone.now();
    const voice =
      pool.find((entry) => entry.busyUntil <= now) ??
      pool.reduce((oldest, entry) => (entry.busyUntil < oldest.busyUntil ? entry : oldest));
    const safeAt = Math.max(at, voice.busyUntil + 0.001);
    voice.synth.volume.value = Tone.gainToDb(Math.max(0.0001, gain));
    voice.synth.triggerAttackRelease(freq, duration, safeAt);
    voice.busyUntil = safeAt + duration + 0.05;
  }

  return {
    async resumeFromGesture() {
      await Tone.start();
      if (disposed) return;
      ready = true;
      startLoop();
    },
    setTheme(nextTheme: string) {
      if (theme === nextTheme && bgmTimer !== null) return;
      stopLoop();
      theme = nextTheme;
      startLoop();
    },
    playSfx(id: string) {
      if (muted) return;
      const recipe = audio.sfx[id as keyof typeof audio.sfx] as SfxRecipe | undefined;
      if (!recipe) return;
      sfxPlayed += 1;
      const now = Tone.now();
      if (recipe.arpeggio) {
        recipe.arpeggio.notes.forEach((note, i) => {
          triggerPooledSfxNote(
            recipe.osc,
            note,
            recipe.arpeggio?.noteGain ?? 0.05,
            recipe.arpeggio?.noteDecay ?? 0.18,
            now + i * (recipe.arpeggio?.stepTime ?? 0.08),
          );
        });
        return;
      }
      if (recipe.sequence) {
        let offset = 0;
        recipe.sequence.notes.forEach((note, i) => {
          const duration = recipe.sequence?.durations[i] ?? 0.12;
          triggerPooledSfxNote(
            recipe.osc,
            note,
            recipe.sequence?.noteGain ?? 0.05,
            duration,
            now + offset,
          );
          offset += duration;
        });
        return;
      }
      const duration = recipe.duration ?? 0.2;
      const oscillator = new Tone.Oscillator(recipe.freq?.[0]?.v ?? 440, recipe.osc as never);
      const gain = new Tone.Gain(recipe.gain?.[0]?.v ?? 0.08).connect(output);
      oscillator.connect(gain);
      scheduleRamp(oscillator.frequency, recipe.freq, now);
      scheduleRamp(gain.gain, recipe.gain, now);
      oscillator.start(now);
      oscillator.stop(now + duration);
      window.setTimeout(
        () => {
          oscillator.dispose();
          gain.dispose();
        },
        Math.ceil((duration + 0.2) * 1000),
      );
    },
    setMuted(nextMuted: boolean) {
      muted = nextMuted;
      output.mute = muted;
    },
    debugState() {
      return {
        label: `Tone ${Tone.version}`,
        ready,
        muted,
        theme,
        sfxPlayed,
      };
    },
    dispose() {
      disposed = true;
      stopLoop();
      for (const pool of sfxPools.values()) {
        for (const voice of pool) voice.synth.dispose();
      }
      bgmSynth.dispose();
      output.dispose();
    },
  };
}
