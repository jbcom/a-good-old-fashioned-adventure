import { densest, type Evaluator, mostWounded } from "../field";

/** Priest and cinder fused: mercy below half, the volley otherwise. */
export const shaman: Evaluator = (view) => {
  const patient = mostWounded(view);
  if (patient && patient.hp / patient.maxHp < 0.5) {
    return { kind: "mend", x: patient.x, y: patient.y, allyId: patient.id };
  }
  const pack = densest(view, 40);
  return pack ? { kind: "engage", x: pack.x, y: pack.y, enemyId: pack.id } : { kind: "march" };
};
