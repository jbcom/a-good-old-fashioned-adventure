import { densest, type Evaluator } from "../field";

/** The whirlwind: dive the densest cluster, never the stragglers. */
export const barbarian: Evaluator = (view) => {
  const pack = densest(view, 36);
  return pack
    ? { kind: "dive-cluster", x: pack.x, y: pack.y, enemyId: pack.id }
    : { kind: "march" };
};
