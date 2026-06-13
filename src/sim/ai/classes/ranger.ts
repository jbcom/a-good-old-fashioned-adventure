import { type Evaluator, frontFight } from "../field";

/** The marksman: shoot what the front is already fighting. */
export const ranger: Evaluator = (view) => {
  const target = frontFight(view);
  return target
    ? { kind: "engage", x: target.x, y: target.y, enemyId: target.id }
    : { kind: "march" };
};
