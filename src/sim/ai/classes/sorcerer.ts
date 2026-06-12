import { densest, type Evaluator } from "../field";

/** The artillerist: lead volleys at the largest pack. */
export const sorcerer: Evaluator = (view) => {
  const pack = densest(view, 40);
  return pack ? { kind: "engage", x: pack.x, y: pack.y, enemyId: pack.id } : { kind: "march" };
};
