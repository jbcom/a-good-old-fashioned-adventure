/**
 * Sheet sprite resolution (docs/CONTENT-ARCHITECTURE.md §Purchased PNG
 * sheet sprites): pure mapping from live sim state (pose name, choreography
 * phase, facing, movement, deterministic clock) onto a source rect inside a
 * purchased sheet image. No DOM — the atlas owns pixels, this owns math.
 */
import type { AnySpriteDef, SheetAnimDef, SheetSpriteDef } from "./types";

export type SheetDirection = "right" | "up" | "left" | "down";

/** Type guard: true if def is a purchased PNG sheet sprite (not character-sprite). */
export function isSheetSprite(def: AnySpriteDef): def is SheetSpriteDef {
  return def.kind === "sheet-sprite";
}

/** Query state to resolve a frame from a sheet sprite definition. */
export interface SheetFrameQuery {
  /** pose name from spritePose() — the .pix vocabulary (idle, walk-0, walk-up-1, attack, hurt) */
  pose: string;
  /** Choreo trait phase ("" when none) — outranks pose when mapped */
  choreoPhase: string;
  /** Facing trait dir: 1 right, -1 left */
  facingDir: 1 | -1;
  /** live MoveIntent — vertical motion picks the up/down blocks */
  moveX: number;
  moveY: number;
  /** deterministic sim clock (seconds) */
  t: number;
}

/** Resolved frame: animation block, direction, source rect, and mirror flag. */
export interface SheetFrame {
  animName: string;
  anim: SheetAnimDef;
  direction: SheetDirection;
  /** source rect origin inside the animation's image */
  sourceX: number;
  sourceY: number;
  /** true → renderer flips horizontally (side-view sheet facing the other way) */
  mirror: boolean;
}

/** "walk-1" → walk; "walk-up-0" → walk + forced up. */
function normalizePose(pose: string): { key: string; forcedDir: SheetDirection | null } {
  const up = pose.match(/^(.+)-up-\d+$/);
  if (up) return { key: up[1], forcedDir: "up" };
  const framed = pose.match(/^(.+)-\d+$/);
  return { key: framed ? framed[1] : pose, forcedDir: null };
}

/** Map sim state (pose/choreo/facing/move/clock) onto a frame inside the sheet sprite. */
export function resolveSheetFrame(def: SheetSpriteDef, query: SheetFrameQuery): SheetFrame {
  const phaseMapped = query.choreoPhase !== "" && def.poseMap[query.choreoPhase] !== undefined;
  const { key, forcedDir } = normalizePose(phaseMapped ? query.choreoPhase : query.pose);
  const animName = def.poseMap[key] ?? def.poseMap.idle;
  if (def.poseMap[key] === undefined && import.meta.env?.DEV) {
    // a typo'd or newly-added sim pose would silently idle forever
    console.warn(`${def.id}: pose "${query.pose}" unmapped — falling back to idle`);
  }
  const anim = def.animations[animName];
  if (!anim)
    throw new Error(`${def.id}: poseMap resolves ${key} to undeclared animation ${animName}`);

  let direction: SheetDirection;
  if (forcedDir) {
    direction = forcedDir;
  } else if (Math.abs(query.moveY) > 0 && Math.abs(query.moveY) >= Math.abs(query.moveX)) {
    direction = query.moveY < 0 ? "up" : "down";
  } else {
    direction = query.facingDir === -1 ? "left" : "right";
  }

  const fpd = anim.framesPerDirection;
  const raw = Math.floor(query.t * anim.fps);
  const frame = anim.loop === false ? Math.min(raw, fpd - 1) : raw % fpd;
  // directionRows owns direction addressing — block arithmetic must not
  // also shift the column (latent double-offset if a def set both)
  const block =
    anim.directional && !anim.directionRows
      ? Math.max(0, def.directionOrder.indexOf(direction))
      : 0;
  const dirCell = anim.directionRows?.[direction];
  const row =
    dirCell === undefined ? (anim.row ?? 0) : typeof dirCell === "number" ? dirCell : dirCell.row;
  const startCol = typeof dirCell === "object" ? dirCell.col : 0;

  // side-view sheets carry one native facing; flip when the entity points
  // the other way (vertical travel keeps the last horizontal facing). A
  // directional animation already picked its block, and directionRows
  // author every direction — mirroring either would double-flip.
  let mirror = false;
  if (def.facing && !anim.directional && !anim.directionRows) {
    const horizontal =
      direction === "left" || direction === "right"
        ? direction
        : query.facingDir === -1
          ? "left"
          : "right";
    mirror = horizontal !== def.facing.nativeDir;
  }

  return {
    animName,
    anim,
    direction,
    sourceX: (block * fpd + startCol + frame) * def.frameSize.w,
    sourceY: row * def.frameSize.h,
    mirror,
  };
}
