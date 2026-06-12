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

/** Short-lived combat/motion feedback burst: swing arcs, death dissolves. */
export interface FxBurstState {
  kind: "swing" | "dissolve" | "trail";
  spriteId: string;
  paletteId: string;
  dir: number;
  left: number;
  total: number;
}

export const FxBurst = trait(
  (): FxBurstState => ({
    kind: "swing",
    spriteId: "",
    paletteId: "palette:base",
    dir: 1,
    left: 0,
    total: 0,
  }),
);

/** World resource: monotonic count of spawned fx bursts (test observability). */
export const FxStats = trait({ spawned: 0 });

/** Enemy threat telegraph: touch damage arms only after a visible wind-up. */
export const Threat = trait({ windupLeft: 0, armed: false, casting: false });
/**
 * Boss choreography: the current phase of a config-timed fight pattern
 * (dragon roar/volley/lull, banner-knight guard/open). Public so the
 * renderer and tests read the same state (docs/DESIGN-SYSTEM.md).
 */
export const Choreo = trait({ phase: "", left: 0 });
export const PropRef = trait({ propId: "", state: "default" });
export const NpcPatrol = trait(() => ({
  points: [] as { x: number; y: number }[],
  targetIndex: 0,
  speed: 0,
}));

export const IsPlayer = trait({ classId: "" });
/** Rail-command allied unit: fights autonomously by class temperament. */
export const IsUnit = trait({ classId: "" });
export const IsNpc = trait({ charId: "" });
/** bounty: extra coins this spawn pays on defeat (warband reinforcements). */
export const IsEnemy = trait({ archetypeId: "", bounty: 0 });
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

export const Projectile = trait({ type: "", vx: 0, vy: 0, life: 0, trail: 0, fromPlayer: false });
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
/** World resource: remaining hit-stop — sim time freezes while it drains. */
export const HitStop = trait({ left: 0 });
/**
 * Rail-command wave machine (docs/RAIL-COMMAND.md §waves): `wave` is the
 * last wave released, `engaged` flips when the first unit lands. Wave
 * spawns carry WaveSpawned so authored map enemies never gate the cycle.
 */
export const WaveState = trait({ wave: 0, engaged: false });
export const WaveSpawned = trait({ wave: 0 });
/** Units deployed this run, by class — roster spending is sim state. */
export const RosterPlaced = trait(() => ({ counts: {} as Record<string, number> }));
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
  /** Extra coins carried by a warband reinforcement, paid on defeat. */
  bounty?: number;
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

export interface IncrementalLastRun {
  result: "victory" | "gameover";
  coinsEarned: number;
  rosesEarned: number;
  rescuedPrincess: boolean;
  routePackId: string;
}

export interface IncrementalProgressState {
  coins: number;
  roses: number;
  rescueCount: number;
  purchasedUpgradeIds: string[];
  upgradeRanks: Record<string, number>;
  defeatedMinibossIds: string[];
  unlockedClassIds: string[];
  unlockedRoutePackIds: string[];
  currentRunCoinsEarned: number;
  currentRunRosesEarned: number;
  /** road-waypoint zones already paid this run (map:trigger keys). */
  currentRunRoadIds: string[];
  activeRoutePackId: string;
  lastRun: IncrementalLastRun | null;
}

export const IncrementalProgress = trait(
  (): IncrementalProgressState => ({
    coins: 0,
    roses: 0,
    rescueCount: 0,
    purchasedUpgradeIds: [],
    upgradeRanks: {},
    defeatedMinibossIds: [],
    unlockedClassIds: [],
    unlockedRoutePackIds: [],
    currentRunCoinsEarned: 0,
    currentRunRosesEarned: 0,
    currentRunRoadIds: [],
    activeRoutePackId: "baseline",
    lastRun: null,
  }),
);

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
