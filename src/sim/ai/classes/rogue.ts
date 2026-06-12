import { dist, type Evaluator, engageNearest } from "../field";

/** The assassin: slip the wall, kill the back line first. */
export const rogue: Evaluator = (view) => {
  const prey = view.enemies.filter((enemy) => enemy.backline);
  if (prey.length > 0) {
    const target = prey.reduce((a, b) => (dist(view.self, b) < dist(view.self, a) ? b : a));
    return { kind: "hunt-backline", x: target.x, y: target.y, enemyId: target.id };
  }
  return engageNearest(view);
};
