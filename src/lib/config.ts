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

export interface ClassDef {
  playable?: boolean;
  sprite: string;
  palette: string;
  attack: ClassAttack;
  ability: ClassAbility;
}

export type IncrementalCurrencyId = "coins" | "roses";

export interface IncrementalCurrencyDef {
  label: string;
  shortLabel: string;
  relativeVolume: "common" | "rare";
  rarityRatioAgainstCoins?: number;
  primarySources: string[];
  spendRoles: string[];
  hudPriority: number;
}

export interface IncrementalUpgradeNode {
  id: string;
  label: string;
  category: "route" | "enemy" | "class" | "ability" | "map" | "relic";
  cost: Partial<Record<IncrementalCurrencyId, number>>;
  prerequisites: string[];
  unlocks: string[];
  classId?: string;
  routePack?: string;
  enemyFamily?: string;
  ability?: string;
  ranks?: number;
  rankCostGrowth?: number;
  effect?: { maxHp?: number };
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
  };
  currencies: Record<IncrementalCurrencyId, IncrementalCurrencyDef>;
  runRewards: Record<
    string,
    { currency: IncrementalCurrencyId; base?: number; eliteBonus?: number; perSegment?: number }
  >;
  upgradeGraph: {
    root: string;
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
}

export interface EnemyArchetype {
  name: string;
  sprite: string;
  palette: string;
  hp: number;
  speed: number;
  hitbox: { w: number; h: number };
  behavior: "patrol" | "chase" | "caster" | "turret" | "boss" | "ambush" | "guard";
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
export const incremental = incrementalJson as unknown as IncrementalConfig;
export const drops = dropsJson;
export const enemies = enemiesJson as unknown as {
  aiDefaults: { aggroRange: number; deaggroRange: number; patrolRange: number };
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
