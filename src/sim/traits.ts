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
/** World position and size of an entity. */
export const Transform = trait({ x: 0, y: 0 });
/** Facing direction: 1 for right, -1 for left. */
export const Facing = trait({ dir: 1 });
/** Collision box dimensions for hit detection. */
export const Hitbox = trait({ w: 10, h: 10 });
/** Current and maximum hit points. */
export const Health = trait({ hp: 1, maxHp: 1 });
/** Movement speed scalar. */
export const Speed = trait({ value: 0 });
/** Desired movement direction this frame. */
export const MoveIntent = trait({ x: 0, y: 0 });
/** Targeting direction for attacks and abilities. */
export const AimDirection = trait({ x: 1, y: 0 });
/** Visual representation: sprite ID and palette override. */
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

/** Animates short-lived combat/motion feedback bursts: swing arcs, death dissolves, trails. */
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

/** Withered (warlock line): slowed and softened while it lasts. */
export const Withered = trait({ left: 0 });
/** Enemy threat telegraph: touch damage arms only after a visible wind-up. */
export const Threat = trait({ windupLeft: 0, armed: false, casting: false });
/**
 * Boss choreography: the current phase of a config-timed fight pattern
 * (dragon roar/volley/lull, banner-knight guard/open). Public so the
 * renderer and tests read the same state (docs/DESIGN-SYSTEM.md).
 */
export const Choreo = trait({ phase: "", left: 0 });
/**
 * Per-map kin boss identity (docs/RAIL-COMMAND.md §dragon's kin). Attached to a
 * dragon-family boss when the active map's kin is unlocked: `relation` is the
 * tracked modifier the rescue quip uses ("brother", "step-cousin"…). The kin's
 * COLOR comes from its baked sheet (sprite:high-dragon-<slug>), not this trait —
 * so the death/firebreath/idle frames all match. Absent on the bare
 * dragon-guardian (no kin unlocked).
 */
export const KinIdentity = trait({ relation: "", mapId: "" });
/**
 * Dragon-track combat buff (docs/RAIL-COMMAND.md §The Dragon track BUFFS the
 * dragon). Applied to a kin boss from the purchased dragon-might ranks for its
 * map: `extraBolts` widens the volley (multi-attack), `aoeRadius` arms a
 * fireball burst, `rewardMult` scales the roses the rescue pays. A buffed
 * dragon is a stronger antagonist that pays more — the rose flywheel.
 */
export const DragonBuff = trait({ extraBolts: 0, aoeRadius: 0, rewardMult: 1 });
/** Interactive prop instance: which prop definition and current interaction state. */
export const PropRef = trait({ propId: "", state: "default" });
/** NPC patrol route: waypoints, current target, and movement speed. */
export const NpcPatrol = trait(() => ({
  points: [] as { x: number; y: number }[],
  targetIndex: 0,
  speed: 0,
}));

/** Player character class reference. */
export const IsPlayer = trait({ classId: "" });
/** Rail-command allied unit: fights autonomously by class temperament. */
export const IsUnit = trait({ classId: "" });
/** NPC dialogue character reference. */
export const IsNpc = trait({ charId: "" });
/** Enemy archetype and loot bounty (warband reinforcements pay extra). */
export const IsEnemy = trait({ archetypeId: "", bounty: 0 });
/** Pickup item and quantity value. */
export const IsPickup = trait({ itemId: "", value: 0 });
/** Marks an entity as blocking collision. */
export const IsSolid = trait();

/** Loot container: items to drop and opened state. */
export const LootContainer = trait({ contents: "", opened: false });
/** Interaction state: verb, one-time flag, used status, audio/animation feedback, dialogue. */
export const Interactable = trait({
  verb: "",
  once: false,
  used: false,
  sfx: "",
  feedbackAnim: "",
  dialogueBank: "",
  dialogueSlot: "",
});
/** Animation and serial for the inspection pulse feedback effect. */
export const InspectionPulse = trait({ anim: "", serial: 0 });

/** Experience and leveling state. */
export const Level = trait({ level: 1, xp: 0, nextXp: 50 });
/** Combat cooldown counters for attacks, dashes, and hit-stun frames. */
export const CombatTimers = trait({ attack: 0, dash: 0, dashCooldown: 0, iframes: 0 });
/** Footstep cadence: distance travelled since the last footstep cue. */
export const Footsteps = trait({ travelled: 0 });
/** Active shield state. */
export const ShieldState = trait({ active: false });
/** Hit-flash feedback counter. */
export const HitFlash = trait({ left: 0 });

/** Flying projectile: type, velocity, lifespan, trail effect, and source origin. */
export const Projectile = trait({ type: "", vx: 0, vy: 0, life: 0, trail: 0, fromPlayer: false });
/** Item inventory keyed by itemId with counts. */
export const Inventory = trait(() => ({ items: {} as Record<string, number> }));

// — world-level resources —
/** Active map runtime: tile grid, dimensions, and revision counter for recomposition. */
export const MapRuntime = trait(() => ({
  mapId: "",
  cols: 0,
  rows: 0,
  grid: [] as string[][],
  /** bumped whenever a tile mutates (e.g. bridge repair) so renderers recompose */
  rev: 0,
}));
/** Boolean flag state keyed by flag ID. */
export const FlagState = trait(() => ({ values: {} as Record<string, boolean> }));
/** Random number generator state seeded for determinism. */
export const RngState = trait({ seed: 1 });
/** Simulation time and delta-time for frame-independent updates. */
export const Clock = trait({ t: 0, dt: 0 });
/** World resource: remaining hit-stop — sim time freezes while it drains. */
export const HitStop = trait({ left: 0 });
/**
 * Rail-command wave machine (docs/RAIL-COMMAND.md §waves): `wave` is the
 * last wave released, `engaged` flips when the first unit lands. Wave
 * spawns carry WaveSpawned so authored map enemies never gate the cycle.
 */
export const WaveState = trait({ wave: 0, engaged: false });
/** Marks spawned enemies as belonging to a specific wave. */
export const WaveSpawned = trait({ wave: 0 });
/** Units deployed this run, by class — roster spending is sim state. */
export const RosterPlaced = trait(() => ({ counts: {} as Record<string, number> }));
/** Camera position and screen-shake intensity. */
export const CameraState = trait({ x: 0, y: 0, shake: 0 });

/** Gameplay event for quest tracking, rewards, and progression. */
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
  /** Kin relation of a felled dragon-kin boss (docs/RAIL-COMMAND.md §kin). */
  kinRelation?: string;
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

/** World resource: game events queued for processing each frame. */
export const EventQueue = trait(() => ({ events: [] as GameEvent[] }));

/** Last completed run summary for post-game display. */
export interface IncrementalLastRun {
  result: "victory" | "gameover";
  coinsEarned: number;
  gemsEarned: number;
  rosesEarned: number;
  rescuedPrincess: boolean;
  routePackId: string;
}

/** Persistent player progression: currency, unlocks, and meta-upgrades. */
export interface IncrementalProgressState {
  coins: number;
  /** dragon-hoard currency (docs/RAIL-COMMAND.md §Three currencies): from
   * dragon-kin, spends on the majors (new maps/classes). */
  gems: number;
  roses: number;
  rescueCount: number;
  purchasedUpgradeIds: string[];
  upgradeRanks: Record<string, number>;
  defeatedMinibossIds: string[];
  /** kin relations the player has felled (docs/RAIL-COMMAND.md §dragon's kin):
   * drives the rescue quip ("you've met the brother and the uncle…"). */
  defeatedKinRelations: string[];
  unlockedClassIds: string[];
  unlockedRoutePackIds: string[];
  currentRunCoinsEarned: number;
  currentRunGemsEarned: number;
  currentRunRosesEarned: number;
  /** road-waypoint zones already paid this run (map:trigger keys). */
  currentRunRoadIds: string[];
  activeRoutePackId: string;
  lastRun: IncrementalLastRun | null;
}

/** World resource: persistent player progression wrapped in a trait. */
export const IncrementalProgress = trait(
  (): IncrementalProgressState => ({
    coins: 0,
    gems: 0,
    roses: 0,
    rescueCount: 0,
    purchasedUpgradeIds: [],
    upgradeRanks: {},
    defeatedMinibossIds: [],
    defeatedKinRelations: [],
    unlockedClassIds: [],
    unlockedRoutePackIds: [],
    currentRunCoinsEarned: 0,
    currentRunGemsEarned: 0,
    currentRunRosesEarned: 0,
    currentRunRoadIds: [],
    activeRoutePackId: "baseline",
    lastRun: null,
  }),
);

/** Map transition request with optional spawn point override. */
export interface MapLoadRequest {
  mapId: string;
  spawnId?: string;
}

/** Quest state: current stage and counter progress. */
export interface ActiveQuest {
  stage: string;
  counters: Record<string, number>;
}

/** World resource: active and completed quests. */
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
