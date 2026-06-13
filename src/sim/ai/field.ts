/**
 * The shared field vocabulary for class minds (directive S18.3): a
 * deterministic perception (positions and hp only) and the typed goals an
 * evaluator may choose. Each class's mind lives in ./classes/<id>.ts —
 * one file per personality, registered in ./index.ts.
 */
export interface FieldEnemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  /** ranged threats hide behind tanks: the rogue's prey */
  backline: boolean;
}

/** Ally unit state visible to AI evaluators. */
export interface FieldAlly {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

/** Deterministic battlefield snapshot the evaluator receives. */
export interface FieldView {
  self: { x: number; y: number };
  enemies: FieldEnemy[];
  allies: FieldAlly[];
}

/** Tactical intent type returned by class evaluators. */
export type UnitGoal =
  | { kind: "engage"; x: number; y: number; enemyId: number }
  | { kind: "hunt-backline"; x: number; y: number; enemyId: number }
  | { kind: "dive-cluster"; x: number; y: number; enemyId: number }
  | { kind: "cover-enemies"; x: number; y: number }
  | { kind: "mend"; x: number; y: number; allyId: number }
  | { kind: "escort"; x: number; y: number }
  | { kind: "march" };

/** Deterministic AI decision function that maps battlefield state to a unit goal. */
export type Evaluator = (view: FieldView) => UnitGoal;

/** Euclidean distance between two points. */
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Returns the closest enemy to the unit, or null if no enemies exist. */
export function nearest(view: FieldView): FieldEnemy | null {
  let best: FieldEnemy | null = null;
  for (const enemy of view.enemies) {
    if (!best || dist(view.self, enemy) < dist(view.self, best)) best = enemy;
  }
  return best;
}

/** Returns the densest enemy cluster anchor within radius; ties broken by southmost position. */
export function densest(view: FieldView, radius: number): FieldEnemy | null {
  let best: FieldEnemy | null = null;
  let bestWeight = -1;
  for (const enemy of view.enemies) {
    const weight = view.enemies.filter((other) => dist(enemy, other) <= radius).length;
    if (weight > bestWeight || (weight === bestWeight && best && enemy.y > best.y)) {
      best = enemy;
      bestWeight = weight;
    }
  }
  return best;
}

/** The point covering the most enemies within `radius`. */
export function bestCoverage(view: FieldView, radius: number): { x: number; y: number } | null {
  let best: FieldEnemy | null = null;
  let bestCovered = -1;
  for (const enemy of view.enemies) {
    const covered = view.enemies.filter((other) => dist(enemy, other) <= radius).length;
    if (covered > bestCovered) {
      best = enemy;
      bestCovered = covered;
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

/** Returns the ally with the lowest hp/maxHp ratio, or null if all are at full health. */
export function mostWounded(view: FieldView): FieldAlly | null {
  let best: FieldAlly | null = null;
  let worst = 1;
  for (const ally of view.allies) {
    const ratio = ally.maxHp > 0 ? ally.hp / ally.maxHp : 1;
    if (ratio < worst) {
      best = ally;
      worst = ratio;
    }
  }
  return worst < 1 ? best : null;
}

/** Returns the geometric median of ally positions; null if no allies. */
export function lineMedian(view: FieldView): { x: number; y: number } | null {
  if (view.allies.length === 0) return null;
  const ys = view.allies.map((ally) => ally.y).sort((a, b) => a - b);
  const xs = view.allies.map((ally) => ally.x).sort((a, b) => a - b);
  const mid = Math.floor(view.allies.length / 2);
  return { x: xs[mid], y: ys[mid] };
}

/** The front line's current fight: the enemy nearest the northmost ally. */
export function frontFight(view: FieldView): FieldEnemy | null {
  if (view.allies.length === 0) return nearest(view);
  const front = view.allies.reduce((a, b) => (b.y < a.y ? b : a));
  let best: FieldEnemy | null = null;
  for (const enemy of view.enemies) {
    if (!best || dist(front, enemy) < dist(front, best)) best = enemy;
  }
  return best;
}

/** Evaluator that targets the nearest enemy, or marches if none. */
export const engageNearest: Evaluator = (view) => {
  const target = nearest(view);
  return target
    ? { kind: "engage", x: target.x, y: target.y, enemyId: target.id }
    : { kind: "march" };
};
