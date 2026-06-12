import { classes } from "../../../lib/config";
import { bestCoverage, type Evaluator } from "../field";

/** The field projector: stand where the wither covers the most enemies. */
export const warlock: Evaluator = (view) => {
  const radius = classes.classes.warlock?.temperament?.auraRadius ?? 70;
  const spot = bestCoverage(view, radius);
  return spot ? { kind: "cover-enemies", x: spot.x, y: spot.y } : { kind: "march" };
};
