import { type Evaluator, engageNearest } from "../field";

/** The wall: body the nearest threat to the line. */
export const knight: Evaluator = engageNearest;
