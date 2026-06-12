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
import {
  IncrementalProgress,
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

/** Trash archetypes of the map's region — bosses stay placed, never waved. */
function waveArchetypes(mapId: string): string[] {
  const region = enemies.difficultyCurve.find((entry) => entry.maps.includes(mapId));
  return (region?.archetypes ?? []).filter((id) => !enemies.archetypes[id]?.miniboss);
}

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
  const archetypes = waveArchetypes(mapId);
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

/** Front line: the northmost living unit's position (rail runs south→north). */
export function frontline(world: World): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  for (const unit of world.query(IsUnit, Transform)) {
    const t = unit.get(Transform);
    if (!t) continue;
    if (!best || t.y < best.y) best = { x: t.x, y: t.y };
  }
  return best;
}
