/**
 * Rail-command waves (docs/RAIL-COMMAND.md §waves): once the first unit
 * lands, gates release waves drawn from the map's region archetypes —
 * starting 1v1 and growing with the wave number plus the adversarial
 * warband ranks the player bought. A new wave releases when the previous
 * wave is dead; all units falling while engaged collapses the run through
 * the standard death-pays-out ledger. Deterministic: no randomness.
 */
import type { World } from "koota";
import { enemies, incremental } from "../../lib/config";
import { getMap } from "../../lib/content/registry";
import { spawnEnemy } from "../factories";
import { recordDeathPayout } from "../incrementalProgress";
import { reduceEvent } from "../quests";
import {
  Choreo,
  IncrementalProgress,
  IsEnemy,
  IsNpc,
  IsPlayer,
  IsUnit,
  MapRuntime,
  Outbox,
  Transform,
  WaveSpawned,
  WaveState,
} from "../traits";

/** Wave size: 1v1 start, +1 every other wave, +1 per owned warband rank. */
export function waveSize(wave: number, warbandRanks: number): number {
  return 1 + Math.floor((wave - 1) / 2) + warbandRanks;
}

function ownedWarbandRanks(world: World): number {
  const ranks = world.get(IncrementalProgress)?.upgradeRanks ?? {};
  let total = 0;
  for (const node of incremental.upgradeGraph.nodes) {
    if (node.enemyFamily && node.spawnBounty) total += ranks[node.id] ?? 0;
  }
  return total;
}

/** Every archetype the player has unlocked via an enemy-DAG node. */
function unlockedEnemies(world: World): Set<string> {
  const owned = new Set(world.get(IncrementalProgress)?.purchasedUpgradeIds ?? []);
  const unlocked = new Set<string>();
  for (const node of incremental.upgradeGraph.nodes) {
    if (node.unlocksEnemy && owned.has(node.id)) unlocked.add(node.unlocksEnemy);
  }
  return unlocked;
}

/**
 * Trash archetypes that spawn in this map's waves: the region's trash
 * INTERSECTED with what the player has unlocked (the enemy DAG dial — the
 * first run unlocks none, so the boss alone holds the princess; the player
 * adds antagonists to raise difficulty AND income). Bosses are never waved.
 */
function waveArchetypes(mapId: string, world: World): string[] {
  const region = enemies.difficultyCurve.find((entry) => entry.maps.includes(mapId));
  const unlocked = unlockedEnemies(world);
  return (region?.archetypes ?? []).filter(
    (id) => !enemies.archetypes[id]?.miniboss && unlocked.has(id),
  );
}

/** Per-tick: advance enemy wave spawning along the rail. */
export function waveStep(world: World): void {
  const mapId = world.get(MapRuntime)?.mapId ?? "";
  if (!mapId) return;
  const gates = getMap(mapId).waveGates ?? [];
  if (gates.length === 0) return;
  const state = world.get(WaveState);
  if (!state) return;

  const units = [...world.query(IsUnit)];
  if (!state.engaged) {
    if (units.length === 0) return;
    world.set(WaveState, { ...state, engaged: true });
  }

  // collapse: the line fell while waves were live — the run closes paid
  if (state.engaged && units.length === 0 && !world.queryFirst(IsPlayer)) {
    const outbox = world.get(Outbox);
    if (outbox && outbox.endGame === null) {
      recordDeathPayout(world);
      outbox.endGame = "gameover";
    }
    return;
  }
  if (units.length === 0) return;

  const alive = [...world.query(WaveSpawned)].length;
  if (alive > 0) return;

  const current = world.get(WaveState);
  if (!current) return;
  const wave = current.wave + 1;
  const archetypes = waveArchetypes(mapId, world);
  if (archetypes.length === 0) return;
  const gate = gates[(wave - 1) % gates.length];
  const size = waveSize(wave, ownedWarbandRanks(world));
  for (let i = 0; i < size; i++) {
    const archetypeId = archetypes[(wave - 1 + i) % archetypes.length];
    const spawned = spawnEnemy(
      world,
      archetypeId,
      gate.x + (i % 3) * 18,
      gate.y - Math.floor(i / 3) * 18,
    );
    spawned.add(WaveSpawned({ wave }));
  }
  world.set(WaveState, { wave, engaged: true });
}

/**
 * Rail-mode rescue (docs/RAIL-COMMAND.md §Endgame): with the line engaged,
 * no pawn in the field, the map's choreographed boss dead, and the front
 * within rescueRadius of Princess Amber, reduce the freed dialogue event
 * directly — the quest engine pays the rose and ends the run in victory
 * exactly as if a pawn had spoken to her.
 */
export function rescueStep(world: World): void {
  const state = world.get(WaveState);
  if (!state?.engaged) return;
  if (world.queryFirst(IsPlayer)) return;
  // any living choreographed enemy means the boss still stands
  if (world.queryFirst(IsEnemy, Choreo)) return;
  let princess: { x: number; y: number } | null = null;
  for (const npc of world.query(IsNpc, Transform)) {
    if (npc.get(IsNpc)?.charId === "char:princess-amber") {
      const t = npc.get(Transform);
      if (t) princess = { x: t.x, y: t.y };
      break;
    }
  }
  if (!princess) return;
  const front = frontline(world);
  if (!front) return;
  if (Math.hypot(front.x - princess.x, front.y - princess.y) > incremental.loop.rescueRadius)
    return;
  reduceEvent(world, { type: "dlg", event: "dlg:princess-amber.freed:seen" });
}

/**
 * Rail advance axis: which way the line pushes (docs/RAIL-COMMAND.md §Rail
 * axis). Derived from the player spawn — spawn at the bottom → south→north,
 * spawn at the left → west→east. The far end is where the princess waits.
 */
export function railAxis(world: World): "north" | "east" {
  const runtime = world.get(MapRuntime);
  if (!runtime) return "north";
  const def = getMap(runtime.mapId);
  // a tall map with a low spawn climbs north; a wide map with a left spawn runs east
  const spawn = def.playerSpawn;
  const w = runtime.cols * 16;
  return spawn.x < w * 0.25 && runtime.cols >= runtime.rows ? "east" : "north";
}

/** How far along the rail axis a point sits — larger is further toward the goal. */
function axisProgress(axis: "north" | "east", x: number, y: number, height: number): number {
  // north: progress grows as y shrinks (climbing up); east: as x grows
  return axis === "east" ? x : height - y;
}

/** Front line: the unit furthest along the rail axis (axis-agnostic). */
export function frontline(world: World): { x: number; y: number } | null {
  const runtime = world.get(MapRuntime);
  const axis = railAxis(world);
  const height = (runtime?.rows ?? 64) * 16;
  let best: { x: number; y: number } | null = null;
  let bestProgress = -Infinity;
  for (const unit of world.query(IsUnit, Transform)) {
    const t = unit.get(Transform);
    if (!t) continue;
    const progress = axisProgress(axis, t.x, t.y, height);
    if (progress > bestProgress) {
      bestProgress = progress;
      best = { x: t.x, y: t.y };
    }
  }
  return best;
}
