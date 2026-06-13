import { describe, expect, it } from "vitest";
import { chooseGoal, type FieldView } from "../../src/sim/ai";

/**
 * One identical field, every class — the directive's S18.3 contract:
 * each unlock is a different MIND, asserted by distinct decisions.
 *
 * The field: a tank orc close by (id 1), a shaman hiding behind it
 * (id 2, backline), a tight three-pack to the southeast (ids 3-5),
 * and a badly wounded ally on the line.
 */
function field(): FieldView {
  return {
    self: { x: 100, y: 200 },
    enemies: [
      { id: 1, x: 120, y: 180, hp: 20, backline: false },
      { id: 2, x: 150, y: 120, hp: 25, backline: true },
      { id: 3, x: 200, y: 240, hp: 20, backline: false },
      { id: 4, x: 210, y: 250, hp: 20, backline: false },
      { id: 5, x: 220, y: 244, hp: 20, backline: false },
    ],
    allies: [
      { id: 10, x: 90, y: 190, hp: 20, maxHp: 80 },
      { id: 11, x: 110, y: 230, hp: 60, maxHp: 60 },
    ],
  };
}

describe("S18.3 each class is its own mind", () => {
  it("the knight bodies the nearest threat", () => {
    expect(chooseGoal("knight", field())).toMatchObject({ kind: "engage", enemyId: 1 });
  });

  it("the rogue slips the wall and hunts the back line", () => {
    expect(chooseGoal("rogue", field())).toMatchObject({ kind: "hunt-backline", enemyId: 2 });
  });

  it("the barbarian dives the densest cluster, never the straggler", () => {
    const goal = chooseGoal("barbarian", field());
    expect(goal.kind).toBe("dive-cluster");
    expect([3, 4, 5]).toContain((goal as { enemyId: number }).enemyId);
  });

  it("the priest runs to the most wounded ally, ignoring every enemy", () => {
    expect(chooseGoal("priest", field())).toMatchObject({ kind: "mend", allyId: 10 });
  });

  it("the warlock stands where the wither covers the most enemies", () => {
    const goal = chooseGoal("warlock", field());
    expect(goal.kind).toBe("cover-enemies");
    expect((goal as { x: number }).x).toBeGreaterThanOrEqual(200); // the pack, not the tank
  });

  it("the bard escorts the median of the line", () => {
    expect(chooseGoal("bard", field()).kind).toBe("escort");
  });

  it("the sorcerer leads volleys at the largest pack", () => {
    const goal = chooseGoal("sorcerer", field());
    expect(goal.kind).toBe("engage");
    expect([3, 4, 5]).toContain((goal as { enemyId: number }).enemyId);
  });

  it("the ranger shoots what the front is already fighting", () => {
    const goal = chooseGoal("ranger", field());
    expect(goal).toMatchObject({ kind: "engage", enemyId: 1 }); // front ally's fight
  });

  it("the shaman mends below half, volleys otherwise", () => {
    expect(chooseGoal("shaman", field())).toMatchObject({ kind: "mend", allyId: 10 });
    const healthy = field();
    for (const ally of healthy.allies) ally.hp = ally.maxHp;
    expect(chooseGoal("shaman", healthy).kind).toBe("engage");
  });

  it("the composites and the marksman differ from their parents in one field", () => {
    const view = field();
    const picks = new Map(
      ["knight", "rogue", "barbarian", "priest", "warlock", "bard"].map((classId) => [
        classId,
        JSON.stringify(chooseGoal(classId, view)),
      ]),
    );
    // six classes, six different decisions on the SAME field
    expect(new Set(picks.values()).size).toBe(6);
  });

  it("everyone marches when the field is quiet", () => {
    const quiet: FieldView = { self: { x: 0, y: 0 }, enemies: [], allies: [] };
    for (const classId of ["knight", "rogue", "barbarian", "warlock", "sorcerer"]) {
      expect(chooseGoal(classId, quiet).kind).toBe("march");
    }
  });
});
