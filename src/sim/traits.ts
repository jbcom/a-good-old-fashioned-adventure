/**
 * The Koota trait vocabulary. Content files name these in `koota.traits`;
 * factories attach them. World-level traits (added via `world.add`) act as
 * singleton resources.
 *
 * Tile semantics ("Tile", "Solid" in tile content) live in the MapRuntime
 * grid, not per-tile entities — 4,608 overworld tiles as entities would be
 * waste; collision reads the grid directly.
 */
import { trait } from "koota";

// — entity traits —
export const Transform = trait({ x: 0, y: 0 });
export const Facing = trait({ dir: 1 });
export const Hitbox = trait({ w: 10, h: 10 });
export const Health = trait({ hp: 1, maxHp: 1 });
export const Speed = trait({ value: 0 });
export const MoveIntent = trait({ x: 0, y: 0 });
export const AimDirection = trait({ x: 1, y: 0 });
export const SpriteRef = trait({ spriteId: "", paletteId: "" });
export const PropRef = trait({ propId: "", state: "default" });
export const NpcPatrol = trait(() => ({
  points: [] as { x: number; y: number }[],
  targetIndex: 0,
  speed: 0,
}));

export const IsPlayer = trait({ classId: "" });
export const IsNpc = trait({ charId: "" });
export const IsEnemy = trait({ archetypeId: "" });
export const IsPickup = trait({ itemId: "", value: 0 });
export const IsSolid = trait();

export const LootContainer = trait({ contents: "", opened: false });
export const Interactable = trait({
  verb: "",
  once: false,
  used: false,
  sfx: "",
  feedbackAnim: "",
  dialogueBank: "",
  dialogueSlot: "",
});
export const InspectionPulse = trait({ anim: "", serial: 0 });

export const Level = trait({ level: 1, xp: 0, nextXp: 50 });
export const CombatTimers = trait({ attack: 0, dash: 0, dashCooldown: 0, iframes: 0 });
export const ShieldState = trait({ active: false });
export const HitFlash = trait({ left: 0 });

export const Projectile = trait({ type: "", vx: 0, vy: 0, life: 0, fromPlayer: false });
export const PlayerGold = trait({ value: 0 });
export const Inventory = trait(() => ({ items: {} as Record<string, number> }));

// — world-level resources —
export const MapRuntime = trait(() => ({
  mapId: "",
  cols: 0,
  rows: 0,
  grid: [] as string[][],
  /** bumped whenever a tile mutates (e.g. bridge repair) so renderers recompose */
  rev: 0,
}));
export const FlagState = trait(() => ({ values: {} as Record<string, boolean> }));
export const RngState = trait({ seed: 1 });
export const Clock = trait({ t: 0, dt: 0 });
export const CameraState = trait({ x: 0, y: 0, shake: 0 });

export interface GameEvent {
  type:
    | "enemy:defeated"
    | "item:acquired"
    | "dlg"
    | "zone:entered"
    | "map:entered"
    | "shop:buy"
    | "shop:sell";
  archetypeId?: string;
  itemId?: string;
  shopId?: string;
  listingId?: string;
  /** Full dialogue event string, e.g. "dlg:woodcutter.request:accepted". */
  event?: string;
  mapId?: string;
  triggerId?: string;
  x?: number;
  y?: number;
}

export const EventQueue = trait(() => ({ events: [] as GameEvent[] }));

export interface MapLoadRequest {
  mapId: string;
  spawnId?: string;
}

export interface ActiveQuest {
  stage: string;
  counters: Record<string, number>;
}

export const QuestLog = trait(() => ({
  active: {} as Record<string, ActiveQuest>,
  completed: [] as string[],
}));

/**
 * Sim → presentation outbox: side effects the app shell must perform
 * (play sfx, open dialogue, switch maps, end the game). Drained each frame.
 */
export const Outbox = trait(() => ({
  sfx: [] as string[],
  dialogue: null as { bank: string; slot?: string } | null,
  mapLoad: null as MapLoadRequest | null,
  endGame: null as "victory" | "gameover" | null,
}));
