/**
 * Factories own ALL spawning (doctrine: no raw world.spawn outside this
 * module). Each factory translates content/config into trait bundles;
 * instantiateMap is the only way a map comes to life.
 */
import { createWorld, type Entity, type World } from "koota";
import { classes, combat, enemies, incremental, player as playerConfig } from "../lib/config";
import { flags, getCharacter, getMap, getProp } from "../lib/content/registry";
import { collides } from "./collision";
import {
  dragonBuffFor,
  initialIncrementalProgress,
  kinForMap,
  upgradeMaxHpBonus,
} from "./incrementalProgress";
import { buildGrid } from "./mapgen";
import { deepestLairRoom, lairParentMap } from "./mapProgression";
import { railAxis } from "./systems/waves";
import {
  AimDirection,
  CameraState,
  Choreo,
  Clock,
  CombatTimers,
  DragonBuff,
  EventQueue,
  Facing,
  FlagState,
  Footsteps,
  FxBurst,
  type FxBurstState,
  FxStats,
  Health,
  Hitbox,
  HitStop,
  IncrementalProgress,
  Interactable,
  Inventory,
  IsEnemy,
  IsNpc,
  IsPickup,
  IsPlayer,
  IsSolid,
  IsUnit,
  KinIdentity,
  Level,
  LootContainer,
  MapRuntime,
  MoveIntent,
  NpcPatrol,
  Outbox,
  Projectile,
  PropRef,
  QuestLog,
  RngState,
  RosterPlaced,
  ShieldState,
  Speed,
  SpriteRef,
  Threat,
  Transform,
  WaveState,
} from "./traits";

/**
 * Create a new game world with all singleton traits: MapRuntime, FlagState,
 * RngState, clock, camera, incremental progress, and quest log.
 */
export function createGameWorld(seed = 1): World {
  const world = createWorld();
  const flagDefaults: Record<string, boolean> = {};
  for (const [id, def] of flags) flagDefaults[id] = def.default;
  world.add(
    MapRuntime({ mapId: "", cols: 0, rows: 0, grid: [], rev: 0 }),
    FlagState({ values: flagDefaults }),
    RngState({ seed }),
    Clock({ t: 0, dt: 0 }),
    CameraState({ x: 0, y: 0, shake: 0 }),
    EventQueue({ events: [] }),
    IncrementalProgress(initialIncrementalProgress(playerConfig.baseStats.gold ?? 0)),
    QuestLog({ active: {}, completed: [] }),
    FxStats({ spawned: 0 }),
    HitStop({ left: 0 }),
    WaveState({ wave: 0, engaged: false }),
    RosterPlaced({ counts: {} }),
    Outbox({ sfx: [], dialogue: null, mapLoad: null, endGame: null }),
  );
  return world;
}

/**
 * Spawn the player character at (x, y) with class stats, equipped sprite, and
 * combat/movement traits.
 */
export function spawnPlayer(world: World, classId: string, x: number, y: number): Entity {
  const classDef = classes.classes[classId];
  if (!classDef) throw new Error(`unknown class: ${classId}`);
  const base = playerConfig.baseStats;
  const hpBonus = upgradeMaxHpBonus(world.get(IncrementalProgress), classId);
  return world.spawn(
    IsPlayer({ classId }),
    Transform({ x, y }),
    Facing({ dir: 1 }),
    Hitbox(playerConfig.movement.hitbox),
    Health({ hp: base.hp + hpBonus, maxHp: base.maxHp + hpBonus }),
    Level({ level: base.level, xp: base.xp, nextXp: base.nextXp }),
    Speed({ value: playerConfig.movement.speed }),
    MoveIntent({ x: 0, y: 0 }),
    AimDirection({ x: 1, y: 0 }),
    CombatTimers({ attack: 0, dash: 0, dashCooldown: 0, iframes: 0 }),
    ShieldState({ active: false }),
    Footsteps({ travelled: 0 }),
    Inventory({ items: {} }),
    SpriteRef({ spriteId: classDef.sprite, paletteId: classDef.palette }),
  );
}

/**
 * Spawn an NPC (dialogue, quest giver) with optional patrol waypoints and
 * animation. Stationary if patrol omitted.
 */
export function spawnNpc(
  world: World,
  charId: string,
  x: number,
  y: number,
  dir: 1 | -1 = 1,
  patrol?: { points: { x: number; y: number }[]; speed?: number },
): Entity {
  const character = getCharacter(charId);
  const entity = world.spawn(
    IsNpc({ charId }),
    Transform({ x, y }),
    Facing({ dir }),
    Hitbox({ w: 10, h: 10 }),
    SpriteRef({
      spriteId: character.sprite ?? "sprite:hero",
      paletteId: character.palette ?? "palette:base",
    }),
  );
  if (patrol?.points.length) {
    entity.add(
      NpcPatrol({
        points: patrol.points,
        targetIndex: patrol.points.length > 1 ? 1 : 0,
        speed: patrol.speed ?? 22,
      }),
      Speed({ value: patrol.speed ?? 22 }),
      MoveIntent({ x: 0, y: 0 }),
    );
  }
  return entity;
}

/**
 * Rail-command allied unit (docs/RAIL-COMMAND.md): spawned by toolbox
 * placement, fights autonomously by its class temperament.
 */
export function spawnUnit(world: World, classId: string, x: number, y: number): Entity {
  const classDef = classes.classes[classId];
  const temperament = classDef?.temperament;
  if (!classDef || !temperament) throw new Error(`class ${classId} has no temperament`);
  // DAG vigor ranks shape the class's units now that no pawn exists
  const hpBonus = upgradeMaxHpBonus(world.get(IncrementalProgress), classId);
  const hp = temperament.hp + hpBonus;
  const unit = world.spawn(
    IsUnit({ classId }),
    Transform({ x, y }),
    Facing({ dir: 1 }),
    Hitbox(playerConfig.movement.hitbox),
    Health({ hp, maxHp: hp }),
    Speed({ value: temperament.speed }),
    MoveIntent({ x: 0, y: 0 }),
    AimDirection({ x: 1, y: 0 }),
    CombatTimers({ attack: 0, dash: 0, dashCooldown: 0, iframes: 0 }),
    SpriteRef({ spriteId: classDef.sprite, paletteId: classDef.palette }),
  );
  // S20.2 combat feel: a dust puff kicks up where the unit lands on the rail
  spawnFx(world, {
    kind: "puff",
    spriteId: "sprite:fx-deploy-puff",
    paletteId: "palette:base",
    dir: 1,
    left: combat.feedback.deployPuffDuration,
    x,
    y,
  });
  // S20.3 audio: the deploy thunk as the unit lands
  world.get(Outbox)?.sfx.push("deploy");
  return unit;
}

/**
 * Spawn an enemy by archetype (determines stats, sprite, attack pattern).
 * Bosses receive Choreo; guards receive idle phase.
 */
export function spawnEnemy(world: World, archetypeId: string, x: number, y: number): Entity {
  const archetype = enemies.archetypes[archetypeId];
  if (!archetype) throw new Error(`unknown enemy archetype: ${archetypeId}`);
  const entity = world.spawn(
    IsEnemy({ archetypeId }),
    Transform({ x, y }),
    Facing({ dir: -1 }),
    Hitbox(archetype.hitbox),
    Health({ hp: archetype.hp, maxHp: archetype.hp }),
    Speed({ value: archetype.speed }),
    MoveIntent({ x: 0, y: 0 }),
    Threat({ windupLeft: enemies.aiDefaults.windup.duration, armed: false, casting: false }),
    SpriteRef({ spriteId: archetype.sprite, paletteId: archetype.palette }),
  );
  const phases = archetype.boss?.phases;
  const stance = archetype.guard?.stance;
  if (phases) entity.add(Choreo({ phase: "roar", left: phases.roar }));
  else if (stance) entity.add(Choreo({ phase: "", left: 0 }));
  return entity;
}

/**
 * Spawn a loot container (chest) with contents serialized as a single string
 * (e.g., "item:gold:10,item:sword").
 */
export function spawnChest(world: World, x: number, y: number, contents: string): Entity {
  const prop = getProp("prop:chest");
  return world.spawn(
    PropRef({ propId: prop.id, state: "closed" }),
    Transform({ x, y }),
    LootContainer({ contents, opened: false }),
    Interactable({
      verb: prop.interaction?.verb ?? "open",
      once: prop.interaction?.once ?? true,
      used: false,
      sfx: prop.interaction?.sfx ?? "chest",
      feedbackAnim: prop.interaction?.feedback?.anim ?? "",
      dialogueBank: "",
      dialogueSlot: "",
    }),
  );
}

/**
 * Spawn a prop (decorative or interactive object). Add solid collision and/or
 * interaction traits based on prop definition.
 */
export function spawnProp(world: World, propId: string, x: number, y: number): Entity {
  const prop = getProp(propId);
  const entity = world.spawn(PropRef({ propId, state: "default" }), Transform({ x, y }));
  if (prop.solid) entity.add(IsSolid);
  if (prop.interaction) {
    entity.add(
      Interactable({
        verb: prop.interaction.verb,
        once: prop.interaction.once ?? false,
        used: false,
        sfx: prop.interaction.sfx ?? "",
        feedbackAnim: prop.interaction.feedback?.anim ?? "",
        dialogueBank: prop.interaction.dialogue?.bank ?? "",
        dialogueSlot: prop.interaction.dialogue?.slot ?? "",
      }),
    );
  }
  return entity;
}

/**
 * Spawn a pickup item (coins, equipment) that can be collected by the player.
 * Value is optional (e.g., coin count).
 */
export function spawnPickup(world: World, itemId: string, x: number, y: number, value = 0): Entity {
  return world.spawn(IsPickup({ itemId, value }), Transform({ x, y }));
}

/**
 * Spawn a visual effect (particle burst, flash). Tracks cumulative spawned count
 * in FxStats for performance monitoring.
 */
export function spawnFx(
  world: World,
  fx: Omit<FxBurstState, "total"> & { x: number; y: number },
): Entity {
  const { x, y, ...state } = fx;
  const stats = world.get(FxStats);
  if (stats) world.set(FxStats, { spawned: stats.spawned + 1 });
  else world.add(FxStats({ spawned: 1 }));
  return world.spawn(FxBurst({ ...state, total: state.left }), Transform({ x, y }));
}

/** Spec for spawning a projectile — position, velocity, lifetime, source. */
export interface ProjectileSpawn {
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromPlayer: boolean;
}

/**
 * Spawn a projectile (bullet, spell) with velocity and lifetime. Tracks trail
 * position offset for rendering.
 */
export function spawnProjectile(world: World, spec: ProjectileSpawn): Entity {
  const { x, y, ...rest } = spec;
  return world.spawn(Projectile({ ...rest, trail: 0 }), Transform({ x, y }));
}

/** Options for instantiating a class unit into the world. */
export interface InstantiateOptions {
  classId: string;
  spawnId?: string;
  /** Rail command fields no player pawn — units are the only allies. */
  withPlayer?: boolean;
}

const TILE = 16;

/**
 * Tear down the current map's entities (player persists across maps) and
 * build the named map: grid from generation ops, spawns from the entity
 * table, player moved to the map's spawn point.
 */
export function instantiateMap(world: World, mapId: string, opts: InstantiateOptions): void {
  const def = getMap(mapId);

  const existingPlayer = world.queryFirst(IsPlayer);
  for (const entity of [...world.query(Transform)]) {
    if (!entity.has(IsPlayer)) entity.destroy();
  }

  world.set(MapRuntime, {
    mapId,
    cols: def.size.cols,
    rows: def.size.rows,
    grid: buildGrid(def),
    rev: 0,
  });

  const spawnId = opts.spawnId ?? "default";
  const spawn = def.spawns[spawnId];
  if (!spawn) throw new Error(`${mapId}: unknown spawn ${spawnId}`);
  const { x, y } = spawn;
  if (existingPlayer) {
    existingPlayer.set(Transform, { x, y });
    existingPlayer.set(MoveIntent, { x: 0, y: 0 });
  } else if (opts.withPlayer !== false) {
    spawnPlayer(world, opts.classId, x, y);
  }
  world.set(CameraState, { x, y, shake: 0 });

  const unlockedPacks = world.get(IncrementalProgress)?.unlockedRoutePackIds ?? [];
  const familyHosts = new Map<string, { archetypeId: string; x: number; y: number }[]>();
  for (const spawn of def.entities) {
    // relocation overlays: entities can require or exclude an unlocked pack
    if (spawn.requiresRoutePack && !unlockedPacks.includes(spawn.requiresRoutePack)) continue;
    if (spawn.withoutRoutePack && unlockedPacks.includes(spawn.withoutRoutePack)) continue;
    if (spawn.spawnRule === "unchosen-companions") {
      const companionRoster = classes.companionRoster ?? classes.roster;
      const others = companionRoster.filter((c) => c !== opts.classId);
      for (const [i, pos] of (spawn.positions ?? []).entries()) {
        const companion = others[i];
        if (companion) spawnNpc(world, `char:companion-${companion}`, pos.x, pos.y);
      }
      continue;
    }
    if (spawn.enemy) {
      const enemyEntity = spawnEnemy(world, spawn.enemy, spawn.x as number, spawn.y as number);
      // a dragon-family boss becomes the map's KIN holder when its kin is
      // unlocked (docs/RAIL-COMMAND.md §dragon's kin): swap in the BAKED
      // recolored kin sheet (real art, QC-able by reading the PNG) and tag the
      // entity so the rescue quip knows whose relative just fell.
      const archetype = enemies.archetypes[spawn.enemy];
      if (archetype?.boss && archetype.family === "dragon") {
        const progress = world.get(IncrementalProgress) ?? initialIncrementalProgress();
        const kin = kinForMap(progress, mapId);
        if (kin)
          dressKinBoss(enemyEntity, kin, archetype.palette, mapId, dragonBuffFor(progress, mapId));
      }
      const family = enemies.archetypes[spawn.enemy]?.family;
      if (family) {
        const hosts = familyHosts.get(family) ?? [];
        hosts.push({ archetypeId: spawn.enemy, x: spawn.x as number, y: spawn.y as number });
        familyHosts.set(family, hosts);
      }
      continue;
    }
    if (spawn.ref?.startsWith("char:")) {
      spawnNpc(
        world,
        spawn.ref,
        spawn.x as number,
        spawn.y as number,
        spawn.dir ?? 1,
        spawn.patrol,
      );
      continue;
    }
    if (spawn.ref === "prop:chest") {
      spawnChest(world, spawn.x as number, spawn.y as number, spawn.contents as string);
      continue;
    }
    if (spawn.ref?.startsWith("prop:")) {
      const px = spawn.tileAt ? spawn.tileAt[0] * TILE + TILE / 2 : (spawn.x as number);
      const py = spawn.tileAt ? (spawn.tileAt[1] + 1) * TILE : (spawn.y as number);
      spawnProp(world, spawn.ref, px, py);
    }
  }
  injectLairKin(world, mapId);
  spawnWarbandReinforcements(world, familyHosts);
}

/**
 * Relocate the dragon into the lair (docs/RAIL-COMMAND.md §Each map's FOUR
 * sub-tracks): when this map is a lair room that holds the princess and the
 * parent map's KIN is unlocked, the dragon relocates in too — spawn the kin
 * boss at the room's rail goal (its far end), recolored and buffed like any
 * kin holder. When the dragon is NOT unlocked, the lair just holds the
 * princess (no boss injected here).
 */
function injectLairKin(world: World, mapId: string): void {
  const parentMap = lairParentMap(mapId);
  if (!parentMap) return;
  const progress = world.get(IncrementalProgress) ?? initialIncrementalProgress();
  // only the deepest unlocked room hosts the princess + dragon
  if (deepestLairRoom(progress, parentMap)?.roomMap !== mapId) return;
  const kin = kinForMap(progress, parentMap);
  if (!kin) return; // dragon not unlocked → lair holds only the princess

  // place the kin at the rail goal edge (where the princess waits): for a
  // north-climbing rail the goal is the top (y→0), for an east rail the far
  // right (x→width). One tile in from the edge so the boss is fully on-map.
  const runtime = world.get(MapRuntime);
  if (!runtime) return;
  const axis = railAxis(world);
  const width = runtime.cols * TILE;
  const height = runtime.rows * TILE;
  const goal =
    axis === "east" ? { x: width - TILE * 2, y: height / 2 } : { x: width / 2, y: TILE * 2 };
  const boss = spawnEnemy(world, "dragon-guardian", goal.x, goal.y);
  const dragonArchetype = enemies.archetypes["dragon-guardian"];
  dressKinBoss(boss, kin, dragonArchetype.palette, parentMap, dragonBuffFor(progress, parentMap));
}

/**
 * Dress a freshly-spawned dragon boss as the map's KIN holder identically
 * wherever it spawns (open-map holder OR lair-relocated): tag it with the
 * kin relation, swap in the baked recolored kin sheet, and apply the
 * dragon-track combat buff. `tagMapId` is the map whose kin this is (the
 * parent map for a lair relocation).
 */
function dressKinBoss(
  boss: Entity,
  kin: { relation: string; spriteId: string },
  paletteId: string,
  tagMapId: string,
  buff: { extraBolts: number; aoeRadius: number; rewardMult: number },
): void {
  boss.add(KinIdentity({ relation: kin.relation, mapId: tagMapId }));
  boss.set(SpriteRef, { spriteId: kin.spriteId, paletteId });
  applyDragonBuff(boss, buff);
}

/**
 * Apply the dragon-track buff to a kin boss identically wherever it spawns
 * (open-map holder OR lair-relocated): tag the DragonBuff and, when buffed,
 * make the body tankier (+ per dragon-might rank) so a lair boss is never
 * weaker than its open-map equivalent (reviewer finding 2026-06-13).
 */
function applyDragonBuff(
  boss: Entity,
  buff: { extraBolts: number; aoeRadius: number; rewardMult: number },
): void {
  if (buff.extraBolts <= 0 && buff.aoeRadius <= 0 && buff.rewardMult === 1) return;
  boss.add(DragonBuff(buff));
  if (buff.extraBolts > 0) {
    const health = boss.get(Health);
    if (health) {
      // a buffed dragon is also tankier — +25% hp per might rank
      const hpMult = 1 + (buff.rewardMult - 1) * 0.5;
      boss.set(Health, {
        hp: Math.round(health.hp * hpMult),
        maxHp: Math.round(health.maxHp * hpMult),
      });
    }
  }
}

/**
 * Adversarial warband ranks (docs/INCREMENTAL-RESCUE-LOOP.md §adversarial
 * incrementals): each owned rank of an enemyFamily upgrade node adds one
 * reinforcement beside that family's authored spawns on this map, placed at
 * the first walkable deterministic offset. Reinforcements carry the node's
 * spawnBounty, paid in coins on defeat.
 */
const REINFORCEMENT_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [20, 0],
  [-20, 0],
  [0, 20],
  [0, -20],
  [28, 14],
  [-28, 14],
  [28, -14],
  [-28, -14],
];

function spawnWarbandReinforcements(
  world: World,
  familyHosts: Map<string, { archetypeId: string; x: number; y: number }[]>,
): void {
  const ranks = world.get(IncrementalProgress)?.upgradeRanks ?? {};
  // tile collision can't see entities: track every taken spot so wrapped
  // ranks (more reinforcements than hosts) never stack on a host or peer
  const occupied = new Set<string>();
  for (const hosts of familyHosts.values()) {
    for (const host of hosts) occupied.add(`${host.x},${host.y}`);
  }
  for (const node of incremental.upgradeGraph.nodes) {
    // only bounty-carrying count ranks reinforce; rose majors use
    // enemyFamily as taxonomy (dragon-wake must not clone the boss)
    if (!node.enemyFamily || !node.spawnBounty) continue;
    const owned = ranks[node.id] ?? 0;
    const hosts = familyHosts.get(node.enemyFamily);
    if (owned <= 0 || !hosts?.length) continue;
    for (let i = 0; i < owned; i++) {
      const host = hosts[i % hosts.length];
      const hitbox = enemies.archetypes[host.archetypeId].hitbox;
      const placed = REINFORCEMENT_OFFSETS.map(
        ([dx, dy]) => [host.x + dx, host.y + dy] as const,
      ).find(([x, y]) => !occupied.has(`${x},${y}`) && !collides(world, x, y, hitbox.w, hitbox.h));
      // a fully walled host yields no spot: skip rather than stack entities
      if (!placed) continue;
      occupied.add(`${placed[0]},${placed[1]}`);
      const reinforcement = spawnEnemy(world, host.archetypeId, placed[0], placed[1]);
      const tag = reinforcement.get(IsEnemy);
      if (tag) reinforcement.set(IsEnemy, { ...tag, bounty: node.spawnBounty });
    }
  }
}
