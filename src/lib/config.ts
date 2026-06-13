/**
 * Typed access to src/config/*.json. Sim and presentation read tunables
 * ONLY through this module — never by importing config JSON directly.
 */
import audioJson from "../config/audio.json";
import classesJson from "../config/classes.json";
import combatJson from "../config/combat.json";
import dropsJson from "../config/drops.json";
import enemiesJson from "../config/enemies.json";
import engineJson from "../config/engine.json";
import incrementalJson from "../config/incremental.json";
import playerJson from "../config/player.json";
import progressionJson from "../config/progression.json";
import uiJson from "../config/ui.json";

export interface ClassAttack {
  kind: "melee" | "projectile";
  reach?: number;
  arcHeight?: number;
  cooldown: number;
  projectile?: string;
  speed?: number;
  life?: number;
  muzzleOffset?: { x: number; y: number };
}

export interface ClassAbility {
  kind: "shield" | "leap" | "blink";
  label: string;
  hold?: boolean;
  moveSpeedMultiplier?: number;
  deflectsProjectiles?: boolean;
  contactKnockback?: number;
  backwardDistance?: number;
  forwardDistance?: number;
  spreadAngles?: number[];
  spreadSpeed?: number;
  spreadLife?: number;
  dashSpeedMultiplier?: number;
  cooldown?: number;
  iframes?: number;
  dashDuration?: number;
  trailParticles?: number;
  sfx: string;
}

/** Rail-command unit temperament (docs/RAIL-COMMAND.md §sim model). */
export interface ClassTemperament {
  verb:
    | "charge"
    | "hold-range"
    | "aoe"
    | "flank"
    | "aura"
    | "heal-beam"
    | "debuff-aura"
    | "blade-storm"
    | "storm-volley";
  /** range at which the unit's attack engages */
  engage: number;
  /** sight range: enemies beyond it don't interrupt the rail march */
  perception?: number;
  hp: number;
  speed: number;
  keepDistance?: number;
  chargeSpeedMultiplier?: number;
  blastRadius?: number;
  lateralOffset?: number;
  auraRadius?: number;
  healPerPulse?: number;
  pulsePeriod?: number;
  /** dread-knight composite: every blow applies the Withered debuff */
  withersOnHit?: boolean;
}

export interface ClassDef {
  playable?: boolean;
  sprite: string;
  palette: string;
  attack: ClassAttack;
  ability: ClassAbility;
  temperament?: ClassTemperament;
}

export type IncrementalCurrencyId = "coins" | "gems" | "roses";

export interface IncrementalCurrencyDef {
  label: string;
  shortLabel: string;
  relativeVolume: "common" | "rare";
  rarityRatioAgainstCoins?: number;
  primarySources: string[];
  spendRoles: string[];
  hudPriority: number;
}

export type IncrementalTrackId = "vows" | "characters" | "encounters" | "roads" | "castle";

export interface IncrementalUpgradeNode {
  id: string;
  label: string;
  category: "route" | "enemy" | "class" | "ability" | "map" | "relic" | "economy";
  track: IncrementalTrackId;
  cost: Partial<Record<IncrementalCurrencyId, number>>;
  prerequisites: string[];
  unlocks: string[];
  classId?: string;
  routePack?: string;
  enemyFamily?: string;
  /** Archetype this node activates in the map's waves (the enemy DAG dial). */
  unlocksEnemy?: string;
  /**
   * Per-map kin boss (docs/RAIL-COMMAND.md §dragon's kin). Present on the
   * dragon-unlock node of a map's sub-tree: the map's guardian, recolored
   * from the green High Dragon by `hue`, with a tracked `relation` modifier
   * (brother/uncle/step-cousin…) that the rescue dialogue quips about.
   */
  dragonKin?: {
    mapId: string;
    relation: string;
    /** target hue (deg) the green dragon ramp is rotated to for this kin */
    hue: number;
    /** roses the princess pays for felling this kin on the run */
    roseYield?: number;
  };
  /** Coins each warband reinforcement pays on defeat, beyond enemyDefeated. */
  spawnBounty?: number;
  ability?: string;
  ranks?: number;
  rankCostGrowth?: number;
  effect?: { maxHp?: number; unitCount?: number; checkpointBonus?: number };
  note?: string;
}

export interface IncrementalConfig {
  loop: {
    id: string;
    name: string;
    startClass: string;
    routeShape: "south-to-north";
    playerAnchor: "south";
    princessAnchor: "north";
    guardian: "dragon";
    startMap: string;
    coreRunRequiresCastleInterior: boolean;
    resultsMode: "upgrade-graph";
    targetGameplayAreaPercentPhone: number;
    /** rail-mode rescue trigger distance (docs/RAIL-COMMAND.md §Endgame) */
    rescueRadius: number;
  };
  currencies: Record<IncrementalCurrencyId, IncrementalCurrencyDef>;
  runRewards: Record<
    string,
    { currency: IncrementalCurrencyId; base?: number; eliteBonus?: number; perSegment?: number }
  >;
  upgradeGraph: {
    root: string;
    ringOrder: IncrementalTrackId[];
    trackEntries: Record<IncrementalTrackId, string>;
    lockedTracks: IncrementalTrackId[];
    nodes: IncrementalUpgradeNode[];
  };
  classes: {
    starting: string;
    unlockable: string[];
  };
  routePacks: {
    id: string;
    label: string;
    maps: string[];
    role: string;
  }[];
  mapDag: {
    /** ordered linear spine of route maps — runs play the furthest unlocked */
    order: string[];
    princessAtLastUnlocked: boolean;
    castleNode: string;
    castleMap: string;
  };
}

export interface EnemyArchetype {
  name: string;
  sprite: string;
  palette: string;
  /** Warband family tag: enemyFamily rank nodes reinforce matching spawns. */
  family?: string;
  hp: number;
  speed: number;
  hitbox: { w: number; h: number };
  behavior: "patrol" | "chase" | "caster" | "turret" | "boss" | "ambush" | "guard";
  /** Contact never arms: this enemy threatens only through its attacks. */
  touchHarmless?: boolean;
  /** Blows never displace it: anchored guardians hold their post. */
  knockbackImmune?: boolean;
  miniboss?: boolean;
  relentless?: boolean;
  ambush?: {
    triggerRange: number;
    deaggroRange: number;
  };
  guard?: {
    aggroRange: number;
    deaggroRange: number;
    leashRange: number;
    stance?: {
      guard: number;
      open: number;
      damageMultiplier: number;
      moveFactor: number;
    };
  };
  caster?: {
    attackRange: number;
    keepDistance: number;
    cooldown: number;
    projectile: { type: string; speed: number; life: number };
    sfx: string;
  };
  turret?: {
    attackRange: number;
    cooldown: number;
    projectile: { type: string; speed: number; life: number };
    sfx: string;
  };
  boss?: {
    aggroRange: number;
    cooldown: number;
    spreadAngles: number[];
    projectile: { type: string; speed: number; life: number };
    sfx: string;
    phases?: {
      roar: number;
      volley: number;
      lull: number;
      armorMultiplier: number;
    };
  };
}

export const engine = engineJson;
export const player = playerJson;
export const classes = classesJson as unknown as {
  roster: string[];
  companionRoster?: string[];
  classes: Record<string, ClassDef>;
};
export const combat = combatJson;
export const progression = progressionJson;
// Upgrade nodes live one-per-file under src/config/upgrades/ (split from the
// incremental.json monolith) and are globbed + merged back into the graph at
// build time — the merged shape is identical to the old inline `nodes` array,
// so no consumer changes. Ordering is stable (sorted by id) for determinism.
const upgradeNodeModules = import.meta.glob<IncrementalUpgradeNode>("/src/config/upgrades/*.json", {
  eager: true,
  import: "default",
});
const upgradeNodes = Object.entries(upgradeNodeModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, node]) => {
    // strip the per-file $schema pointer; it is editor tooling, not graph data
    const { $schema: _schema, ...rest } = node as IncrementalUpgradeNode & { $schema?: string };
    return rest as IncrementalUpgradeNode;
  });

export const incremental = {
  ...(incrementalJson as unknown as IncrementalConfig),
  upgradeGraph: {
    ...(incrementalJson as unknown as IncrementalConfig).upgradeGraph,
    nodes: upgradeNodes,
  },
} as IncrementalConfig;
export const drops = dropsJson;
export const enemies = enemiesJson as unknown as {
  aiDefaults: {
    aggroRange: number;
    deaggroRange: number;
    patrolRange: number;
    windup: { duration: number; armRange: number; disarmRange: number; castFlash: number };
  };
  difficultyCurve: {
    id: string;
    label: string;
    tier: number;
    threat: number;
    maps: string[];
    archetypes: string[];
  }[];
  archetypes: Record<string, EnemyArchetype>;
};
export const audio = audioJson;
export const ui = uiJson;
