import { describe, expect, it } from "vitest";
import { createGameWorld, instantiateMap, spawnEnemy } from "../../src/sim/factories";
import { step } from "../../src/sim/tick";
import { Health, IsPlayer, Projectile, Transform } from "../../src/sim/traits";

/**
 * Deterministic AI sims: fixed steps, seeded RNG, open dungeon floor.
 * The player is teleported and held still; we observe enemy motion and
 * casting through the full tick (AI -> movement -> combat).
 */
function scenario(playerAt: { x: number; y: number }) {
  const world = createGameWorld(9);
  instantiateMap(world, "map:castle-dungeon", { classId: "knight" });
  for (const e of [...world.query(Health, Transform)]) {
    if (!e.has(IsPlayer)) e.destroy();
  }
  const player = world.queryFirst(IsPlayer);
  if (!player) throw new Error("no player");
  player.set(Transform, playerAt);
  // park the player out of touch-damage feedback loops where possible
  return { world, player };
}

const seconds = (world: ReturnType<typeof createGameWorld>, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) step(world);
};

describe("patrol behavior (forest orc)", () => {
  it("oscillates near origin while the player is far away", () => {
    const { world } = scenario({ x: 600, y: 460 });
    const orc = spawnEnemy(world, "forest-orc", 200, 200);
    let minX = 200;
    let maxX = 200;
    for (let i = 0; i < 600; i++) {
      step(world);
      const t = orc.get(Transform);
      if (t) {
        minX = Math.min(minX, t.x);
        maxX = Math.max(maxX, t.x);
        expect(Math.abs(t.y - 200)).toBeLessThan(1);
      }
    }
    expect(maxX - minX).toBeGreaterThan(20);
    expect(maxX).toBeLessThan(200 + 50);
    expect(minX).toBeGreaterThan(200 - 50);
  });

  it("aggros within 80px and closes on the player", () => {
    const { world } = scenario({ x: 260, y: 200 });
    const orc = spawnEnemy(world, "forest-orc", 200, 200);
    const startDist = 60;
    seconds(world, 1);
    const t = orc.get(Transform);
    const dist = Math.hypot((t?.x ?? 0) - 260, (t?.y ?? 0) - 200);
    expect(dist).toBeLessThan(startDist - 15);
  });
});

describe("relentless chase (crypt skeleton)", () => {
  it("pursues from far beyond normal aggro range", () => {
    const { world } = scenario({ x: 700, y: 460 });
    const skeleton = spawnEnemy(world, "crypt-skeleton", 150, 120);
    seconds(world, 1);
    const t = skeleton.get(Transform);
    const dist = Math.hypot((t?.x ?? 0) - 700, (t?.y ?? 0) - 460);
    expect(dist).toBeLessThan(Math.hypot(700 - 150, 460 - 120) - 30);
  });
});

describe("caster kiting (forest shaman)", () => {
  it("casts magmaballs in range and backs away when crowded", () => {
    const { world, player } = scenario({ x: 240, y: 200 });
    const shaman = spawnEnemy(world, "forest-shaman", 200, 200); // dist 40 < keepDistance 60
    step(world);
    const bolts = [...world.query(Projectile)].map((e) => e.get(Projectile)?.type);
    expect(bolts).toContain("magmaball");

    player.set(Transform, { x: 240, y: 200 });
    seconds(world, 1);
    const t = shaman.get(Transform);
    const dist = Math.hypot((t?.x ?? 0) - 240, (t?.y ?? 0) - 200);
    expect(dist).toBeGreaterThan(40); // fled outward
  });

  it("holds fire beyond 140px", () => {
    const { world } = scenario({ x: 600, y: 460 });
    spawnEnemy(world, "forest-shaman", 200, 200);
    seconds(world, 1);
    expect([...world.query(Projectile)]).toHaveLength(0);
  });
});

describe("turret (desert wyrm)", () => {
  it("casts sandballs without moving", () => {
    const { world } = scenario({ x: 300, y: 200 });
    const wyrm = spawnEnemy(world, "desert-wyrm", 200, 200);
    seconds(world, 0.5);
    const types = [...world.query(Projectile)].map((e) => e.get(Projectile)?.type);
    expect(types).toContain("sandball");
    expect(wyrm.get(Transform)).toMatchObject({ x: 200, y: 200 });
  });
});

describe("boss (shadow warlord)", () => {
  it("charges and fires a 3-bolt spread on its cooldown", () => {
    const { world } = scenario({ x: 330, y: 200 });
    const boss = spawnEnemy(world, "shadow-warlord", 200, 200);
    step(world);
    const bolts = [...world.query(Projectile)].filter(
      (e) => e.get(Projectile)?.type === "shadowbolt",
    );
    expect(bolts).toHaveLength(3);
    seconds(world, 0.5);
    const t = boss.get(Transform);
    expect((t?.x ?? 0) - 200).toBeGreaterThan(10); // charging toward the player
  });
});
