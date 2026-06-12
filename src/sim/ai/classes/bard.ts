import { type Evaluator, lineMedian } from "../field";

/** The metronome: hold the median of the line inside the aura. */
export const bard: Evaluator = (view) => {
  const median = lineMedian(view);
  return median ? { kind: "escort", x: median.x, y: median.y } : { kind: "march" };
};
