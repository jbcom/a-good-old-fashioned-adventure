import { densest, type Evaluator } from "../field";

/** Wizard and storm fused: dive the pack, bolts for everything in the whirl. */
export const stormcaller: Evaluator = (view) => {
  const pack = densest(view, 48);
  return pack
    ? { kind: "dive-cluster", x: pack.x, y: pack.y, enemyId: pack.id }
    : { kind: "march" };
};
