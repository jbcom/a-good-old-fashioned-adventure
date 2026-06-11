/**
 * AnimeJS bindings: anim:* content compiles to anime.js v4 animations
 * over per-entity channel objects (translateX/Y, alpha). The renderer
 * reads channels when positioning meshes — animation is presentation
 * only and never touches sim state (docs/ARCHITECTURE.md §contract).
 */
import { animate, type JSAnimation } from "animejs";
import { getAnimation } from "../lib/content/registry";

export interface MotionChannels {
  translateX: number;
  translateY: number;
  alpha: number;
}

interface Rig {
  channels: MotionChannels;
  currentAnim: string | null;
  instance: JSAnimation | null;
}

const rigs = new Map<number, Rig>();

const EASE_MAP: Record<string, string> = {
  easeInOutSine: "inOutSine",
  easeInSine: "inSine",
  easeOutSine: "outSine",
  linear: "linear",
};

function freshChannels(): MotionChannels {
  return { translateX: 0, translateY: 0, alpha: 1 };
}

function rigFor(id: number): Rig {
  let rig = rigs.get(id);
  if (!rig) {
    rig = { channels: freshChannels(), currentAnim: null, instance: null };
    rigs.set(id, rig);
  }
  return rig;
}

function startMotion(id: number, animId: string | null, restart: boolean): MotionChannels {
  const rig = rigFor(id);
  if (!restart && rig.currentAnim === animId) return rig.channels;

  rig.instance?.cancel();
  rig.instance = null;
  rig.currentAnim = animId;
  Object.assign(rig.channels, freshChannels());

  if (animId && animId !== "anim:idle") {
    const def = getAnimation(animId);
    const options: Parameters<typeof animate>[1] = {
      duration: def.duration,
      ease: EASE_MAP[def.easing ?? "linear"] ?? "linear",
    };
    if (def.keyframes) {
      options.keyframes = def.keyframes as Record<string, number>[];
    } else {
      Object.assign(options, def.properties ?? {});
    }
    if (def.loop === true || typeof def.loop === "number") options.loop = def.loop;
    rig.instance = animate(rig.channels, options);
  }
  return rig.channels;
}

/** Start (or keep) the named content animation on an entity's channels. */
export function playMotion(id: number, animId: string | null): MotionChannels {
  return startMotion(id, animId, false);
}

/** Force a one-shot content animation to replay on existing channels. */
export function restartMotion(id: number, animId: string | null): MotionChannels {
  return startMotion(id, animId, true);
}

export function channelsOf(id: number): MotionChannels {
  return rigFor(id).channels;
}

export function releaseMotion(id: number): void {
  const rig = rigs.get(id);
  if (rig) {
    rig.instance?.cancel();
    rigs.delete(id);
  }
}

/** One-shot fade used for dash ghosts: animates any object's property. */
export function fadeOut(
  target: Record<string, unknown>,
  property: string,
  from: number,
  durationMs: number,
  onComplete: () => void,
): void {
  animate(target, {
    [property]: [from, 0],
    duration: durationMs,
    ease: "linear",
    onComplete,
  });
}
