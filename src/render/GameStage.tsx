/**
 * The live HD-2D renderer: an imperative r3f scene reconciled from the
 * Koota world every frame (no React re-render per frame). Ground plane
 * composed from MapRuntime (recomposed on rev bump, e.g. bridge repair),
 * billboards from entity queries via the atlas, camera from CameraState.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { World } from "koota";
import { useMemo } from "react";
import {
  CanvasTexture,
  Mesh,
  NearestFilter,
  type PerspectiveCamera,
  PlaneGeometry,
  type Scene,
  type ShaderMaterial,
  SRGBColorSpace,
  type Texture,
} from "three";
import { engine } from "../lib/config";
import { getAnimation, getItem, getSprite } from "../lib/content/registry";
import {
  CameraState,
  CombatTimers,
  Facing,
  HitFlash,
  IsPickup,
  IsPlayer,
  MapRuntime,
  MoveIntent,
  Projectile,
  PropRef,
  SpriteRef,
  Transform,
} from "../sim/traits";
import { flashCanvas, propCanvas, spriteCanvas, tileCanvas } from "./atlas";
import { createDioramaMaterial, setDioramaTexture } from "./materials";
import { fadeOut, playMotion, releaseMotion } from "./motion";

const TILE = 16;
const PROJECTILE_COLORS: Record<string, string> = {
  arrow: "#c2c1e8",
  "magic-bolt": "#e0f2ff",
  magmaball: "#df7126",
  sandball: "#cfa153",
  shadowbolt: "#76428a",
};

const textures = new WeakMap<HTMLCanvasElement, CanvasTexture>();
const solidCanvases = new Map<string, HTMLCanvasElement>();

function textureFor(canvas: HTMLCanvasElement): CanvasTexture {
  let texture = textures.get(canvas);
  if (!texture) {
    texture = new CanvasTexture(canvas);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    textures.set(canvas, texture);
  }
  return texture;
}

function solidCanvas(color: string, width: number, height: number): HTMLCanvasElement {
  const key = `${color}|${width}x${height}`;
  const cached = solidCanvases.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  solidCanvases.set(key, canvas);
  return canvas;
}

function composeGround(world: World): HTMLCanvasElement {
  const runtime = world.get(MapRuntime);
  if (!runtime) throw new Error("no MapRuntime");
  const canvas = document.createElement("canvas");
  canvas.width = runtime.cols * TILE;
  canvas.height = runtime.rows * TILE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < runtime.rows; row++) {
    for (let col = 0; col < runtime.cols; col++) {
      ctx.drawImage(tileCanvas(runtime.grid[row][col]), col * TILE, row * TILE);
    }
  }
  return canvas;
}

interface TrackedMesh {
  mesh: Mesh;
  textureKey: string;
}

interface GroundTrack {
  mapId: string;
  rev: number;
  mesh: Mesh;
}

function disposeGroundMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material as ShaderMaterial;
  (material.uniforms.uMap?.value as Texture | undefined)?.dispose();
  material.dispose();
}

class SceneSync {
  private meshes = new Map<number, TrackedMesh>();
  private ground: GroundTrack | null = null;

  sync(world: World, scene: Scene, camera: PerspectiveCamera): void {
    this.syncGround(world, scene);
    this.syncEntities(world, scene);
    this.syncCamera(world, camera);
  }

  private syncGround(world: World, scene: Scene): void {
    const runtime = world.get(MapRuntime);
    if (!runtime || runtime.mapId === "") return;
    if (this.ground && this.ground.mapId === runtime.mapId && this.ground.rev === runtime.rev) {
      return;
    }
    if (this.ground) {
      scene.remove(this.ground.mesh);
      disposeGroundMesh(this.ground.mesh);
    }
    const canvas = composeGround(world);
    const mesh = new Mesh(
      new PlaneGeometry(canvas.width, canvas.height),
      createDioramaMaterial(textureFor(canvas), { role: "ground" }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(canvas.width / 2, 0, canvas.height / 2);
    scene.add(mesh);
    this.ground = { mapId: runtime.mapId, rev: runtime.rev, mesh };
  }

  private billboard(
    canvasEl: HTMLCanvasElement,
    textureKey: string,
    id: number,
    scene: Scene,
  ): TrackedMesh {
    let tracked = this.meshes.get(id);
    if (!tracked) {
      const mesh = new Mesh(
        new PlaneGeometry(canvasEl.width, canvasEl.height),
        createDioramaMaterial(textureFor(canvasEl), { role: "sprite" }),
      );
      mesh.rotation.x = engine.stage.billboardTilt;
      scene.add(mesh);
      tracked = { mesh, textureKey };
      this.meshes.set(id, tracked);
    } else if (tracked.textureKey !== textureKey) {
      setDioramaTexture(tracked.mesh.material as ShaderMaterial, textureFor(canvasEl));
      tracked.textureKey = textureKey;
    }
    return tracked;
  }

  private syncEntities(world: World, scene: Scene): void {
    const seen = new Set<number>();

    for (const entity of world.query(Transform, SpriteRef)) {
      const t = entity.get(Transform);
      const ref = entity.get(SpriteRef);
      if (!t || !ref) continue;
      const flashing = (entity.get(HitFlash)?.left ?? 0) > 0;
      const canvas = flashing
        ? flashCanvas(ref.spriteId, ref.paletteId)
        : spriteCanvas(ref.spriteId, ref.paletteId);
      const key = `${ref.spriteId}|${ref.paletteId}|${flashing ? "flash" : "base"}`;
      const id = entity as unknown as number;
      const tracked = this.billboard(canvas, key, id, scene);
      const dir = entity.get(Facing)?.dir ?? 1;
      const intent = entity.get(MoveIntent);
      const moving = !!intent && (intent.x !== 0 || intent.y !== 0);
      const spriteDef = getSprite(ref.spriteId);
      const channels = playMotion(
        id,
        moving ? (spriteDef.animations.walk ?? null) : (spriteDef.animations.idle ?? null),
      );
      tracked.mesh.position.set(t.x, canvas.height / 2 - channels.translateY, t.y);
      tracked.mesh.scale.x = dir;
      seen.add(id);
      if (entity.get(IsPlayer)) this.spawnDashGhosts(entity, canvas, scene);
    }

    for (const entity of world.query(Transform, PropRef)) {
      const t = entity.get(Transform);
      const ref = entity.get(PropRef);
      if (!t || !ref) continue;
      const canvas = propCanvas(ref.propId, ref.state);
      const id = entity as unknown as number;
      const tracked = this.billboard(canvas, `${ref.propId}|${ref.state}`, id, scene);
      tracked.mesh.position.set(t.x, canvas.height / 2, t.y);
      seen.add(id);
    }

    for (const entity of world.query(Transform, IsPickup)) {
      const t = entity.get(Transform);
      const info = entity.get(IsPickup);
      if (!t || !info) continue;
      const id = entity as unknown as number;
      let tracked = this.meshes.get(id);
      if (!tracked) {
        const color = getItem(info.itemId).pickup?.color ?? "#ffffff";
        const canvas = solidCanvas(color, 6, 6);
        const mesh = new Mesh(
          new PlaneGeometry(6, 6),
          createDioramaMaterial(textureFor(canvas), { role: "spark" }),
        );
        mesh.rotation.x = engine.stage.billboardTilt;
        scene.add(mesh);
        tracked = { mesh, textureKey: info.itemId };
        this.meshes.set(id, tracked);
      }
      const bobAnim = getItem(info.itemId).pickup?.anim ?? null;
      const channels = playMotion(id, bobAnim);
      tracked.mesh.position.set(t.x, 5 - channels.translateY, t.y);
      seen.add(id);
    }

    for (const entity of world.query(Transform, Projectile)) {
      const t = entity.get(Transform);
      const p = entity.get(Projectile);
      if (!t || !p) continue;
      const id = entity as unknown as number;
      let tracked = this.meshes.get(id);
      if (!tracked) {
        const color = PROJECTILE_COLORS[p.type] ?? "#ffffff";
        const canvas = solidCanvas(color, p.type === "arrow" ? 6 : 4, p.type === "arrow" ? 2 : 4);
        const mesh = new Mesh(
          new PlaneGeometry(p.type === "arrow" ? 6 : 4, p.type === "arrow" ? 2 : 4),
          createDioramaMaterial(textureFor(canvas), { role: "spark" }),
        );
        mesh.rotation.x = engine.stage.billboardTilt;
        scene.add(mesh);
        tracked = { mesh, textureKey: p.type };
        this.meshes.set(id, tracked);
      }
      tracked.mesh.position.set(t.x, 7, t.y);
      seen.add(id);
    }

    for (const [id, tracked] of [...this.meshes]) {
      if (!seen.has(id)) {
        scene.remove(tracked.mesh);
        tracked.mesh.geometry.dispose();
        (tracked.mesh.material as ShaderMaterial).dispose();
        releaseMotion(id);
        this.meshes.delete(id);
      }
    }
  }

  private lastDash = 0;

  /** Dash/blink afterimages: anim:trail-fade content drives ghost opacity. */
  private spawnDashGhosts(
    player: import("koota").Entity,
    canvas: HTMLCanvasElement,
    scene: Scene,
  ): void {
    const dash = player.get(CombatTimers)?.dash ?? 0;
    const started = dash > 0 && this.lastDash <= 0;
    this.lastDash = dash;
    if (!started) return;
    const t = player.get(Transform);
    const dir = player.get(Facing)?.dir ?? 1;
    if (!t) return;
    const trail = getAnimation("anim:trail-fade");
    const startAlpha = ((trail.keyframes?.[0] as { alpha?: number })?.alpha ?? 0.4) as number;
    for (let i = 0; i < 4; i++) {
      const material = createDioramaMaterial(textureFor(canvas), {
        role: "sprite",
        alpha: startAlpha,
      });
      const ghost = new Mesh(new PlaneGeometry(canvas.width, canvas.height), material);
      ghost.rotation.x = engine.stage.billboardTilt;
      ghost.scale.x = dir;
      ghost.position.set(t.x - dir * (i + 1) * 12, canvas.height / 2, t.y);
      scene.add(ghost);
      fadeOut(
        material.uniforms.uAlpha as unknown as Record<string, unknown>,
        "value",
        startAlpha,
        trail.duration + i * 40,
        () => {
          scene.remove(ghost);
          ghost.geometry.dispose();
          material.dispose();
        },
      );
    }
  }

  private syncCamera(world: World, camera: PerspectiveCamera): void {
    const cam = world.get(CameraState);
    if (!cam) return;
    camera.position.set(cam.x, engine.stage.cameraHeight, cam.y + engine.stage.cameraBehind);
    camera.lookAt(cam.x, 0, cam.y + engine.stage.lookAheadZ);
  }
}

function WorldScene({ world }: { world: World }) {
  const { scene, camera } = useThree();
  const sync = useMemo(() => new SceneSync(), []);
  useFrame(() => sync.sync(world, scene as Scene, camera as PerspectiveCamera));
  return null;
}

export function GameStage({ world }: { world: World }) {
  return (
    <Canvas
      dpr={1}
      gl={{ antialias: false }}
      flat
      camera={{
        fov: engine.stage.fov,
        near: engine.stage.near,
        far: engine.stage.far,
        position: [0, engine.stage.cameraHeight, engine.stage.cameraBehind],
      }}
      onCreated={({ gl }) => {
        gl.domElement.dataset.ready = "1";
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#141013"]} />
      <WorldScene world={world} />
    </Canvas>
  );
}
