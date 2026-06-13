import { type Evaluator, lineMedian, mostWounded } from "../field";

/** The mender: the most wounded ally outranks every enemy. */
export const priest: Evaluator = (view) => {
  const patient = mostWounded(view);
  if (patient) return { kind: "mend", x: patient.x, y: patient.y, allyId: patient.id };
  const median = lineMedian(view);
  return median ? { kind: "escort", x: median.x, y: median.y } : { kind: "march" };
};
