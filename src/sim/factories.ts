/**
 * Factories own ALL spawning (doctrine: no raw world.spawn outside this
 * module). Each factory translates content/config into trait bundles;
 * instantiateMap is the only way a map comes to life.
 */
import { createWorld, type Entity, type World } from "koota";
import { classes, enemies, player as playerConfig } from "../lib/config";
import { flags, getCharacter, getMap, getProp } from "../lib/content/registry";
import { buildGrid } from "./mapgen";
import {
  AimDirection,
  CameraState,
  Clock,
  CombatTimers,
  EventQueue,
  Facing,
  FlagState,
  Health,
  Hitbox,
  Interactable,
  Inventory,
  IsEnemy,
  IsNpc,
  IsPickup,
  IsPlayer,
  IsSolid,
  Level,
  LootContainer,
  MapRuntime,
  MoveIntent,
  NpcPatrol,
  Outbox,
  PlayerGold,
  Projectile,
  PropRef,
  QuestLog,
  RngState,
  ShieldState,
  Speed,
  SpriteRef,
  Transform,
} from "./traits";

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
    QuestLog({ active: {}, completed: [] }),
    Outbox({ sfx: [], dialogue: null, mapLoad: null, endGame: null }),
  );
  return world;
}

export function spawnPlayer(world: World, classId: string, x: number, y: number): Entity {
  const classDef = classes.classes[classId];
  if (!classDef) throw new Error(`unknown class: ${classId}`);
  const base = playerConfig.baseStats;
  return world.spawn(
    IsPlayer({ classId }),
    Transform({ x, y }),
    Facing({ dir: 1 }),
    Hitbox(playerConfig.movement.hitbox),
    Health({ hp: base.hp, maxHp: base.maxHp }),
    Level({ level: base.level, xp: base.xp, nextXp: base.nextXp }),
    Speed({ value: playerConfig.movement.speed }),
    MoveIntent({ x: 0, y: 0 }),
    AimDirection({ x: 1, y: 0 }),
    CombatTimers({ attack: 0, dash: 0, dashCooldown: 0, iframes: 0 }),
    ShieldState({ active: false }),
    PlayerGold({ value: playerConfig.baseStats.gold ?? 0 }),
    Inventory({ items: {} }),
    SpriteRef({ spriteId: classDef.sprite, paletteId: classDef.palette }),
  );
}

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

export function spawnEnemy(world: World, archetypeId: string, x: number, y: number): Entity {
  const archetype = enemies.archetypes[archetypeId];
  if (!archetype) throw new Error(`unknown enemy archetype: ${archetypeId}`);
  return world.spawn(
    IsEnemy({ archetypeId }),
    Transform({ x, y }),
    Facing({ dir: -1 }),
    Hitbox(archetype.hitbox),
    Health({ hp: archetype.hp, maxHp: archetype.hp }),
    Speed({ value: archetype.speed }),
    MoveIntent({ x: 0, y: 0 }),
    SpriteRef({ spriteId: archetype.sprite, paletteId: archetype.palette }),
  );
}

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

export function spawnPickup(world: World, itemId: string, x: number, y: number, value = 0): Entity {
  return world.spawn(IsPickup({ itemId, value }), Transform({ x, y }));
}

export interface ProjectileSpawn {
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  fromPlayer: boolean;
}

export function spawnProjectile(world: World, spec: ProjectileSpawn): Entity {
  const { x, y, ...rest } = spec;
  return world.spawn(Projectile(rest), Transform({ x, y }));
}

export interface InstantiateOptions {
  classId: string;
  spawnId?: string;
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
  } else {
    spawnPlayer(world, opts.classId, x, y);
  }
  world.set(CameraState, { x, y, shake: 0 });

  for (const spawn of def.entities) {
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
      spawnEnemy(world, spawn.enemy, spawn.x as number, spawn.y as number);
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
}
