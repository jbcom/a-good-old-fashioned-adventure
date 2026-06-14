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
import { combat, engine } from "../lib/config";
import { getAnimation, getItem, getSprite } from "../lib/content/registry";
import { isSheetSprite, resolveSheetFrame } from "../lib/content/sheetSprite";
import {
  CameraState,
  Choreo,
  Clock,
  CombatTimers,
  Facing,
  FxBurst,
  HitFlash,
  InspectionPulse,
  IsPickup,
  IsPlayer,
  MapRuntime,
  MoveIntent,
  Projectile,
  PropRef,
  SpriteRef,
  Transform,
} from "../sim/traits";
import {
  flashCanvas,
  preloadSheetImages,
  propCanvas,
  sheetFrameCanvas,
  sheetsAreReady,
  spriteCanvas,
  tileFieldCanvas,
} from "./atlas";
import { createDioramaMaterial, setDioramaTexture } from "./materials";
import { channelsOf, fadeOut, playMotion, releaseMotion, restartMotion } from "./motion";
import { iframeAlpha, spritePose, threatScale } from "./pose";

// world grid spacing in WORLD units — must stay 16 to match the sim, which
// places every entity/collision/rail coordinate at 16px per tile.
const TILE = 16;
// the ground TEXTURE is supersampled: each world tile bakes GROUND_RES px wide,
// so a high-res vector tile (64px, RPG Tiles Vector) keeps its full texture on
// the same physical plane instead of being downsampled to 16px and magnified
// into a flat blob. The plane geometry stays in world units; only the texture
// canvas is denser. 64 = the richest terrain pack's native cell size.
const GROUND_RES = 64;
const textures = new WeakMap<HTMLCanvasElement, CanvasTexture>();

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

/** Bake the whole ground plane into one supersampled canvas (exported for the
 * deployed-build black-ground regression test). */
export function composeGround(world: World): HTMLCanvasElement {
  const runtime = world.get(MapRuntime);
  if (!runtime) throw new Error("no MapRuntime");
  // supersampled ground texture: GROUND_RES px per world tile so high-res
  // vector terrain keeps its texture; the plane geometry stays in world units
  const canvas = document.createElement("canvas");
  canvas.width = runtime.cols * GROUND_RES;
  canvas.height = runtime.rows * GROUND_RES;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  // smooth the high-res vector terrain when it scales; pixel packs are near 1:1
  // at GROUND_RES=64 so this only softens sub-pixel edges, never blurs detail
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  for (let row = 0; row < runtime.rows; row++) {
    for (let col = 0; col < runtime.cols; col++) {
      // field ground tiles sample a per-(col,row) cell so the ground shows the
      // pack's variation rather than a seamed repeat; each tile bakes at its own
      // native resolution and is scaled to fill the GROUND_RES cell. Guard a
      // malformed/ragged grid row so a missing cell skips rather than crashes.
      const tileId = runtime.grid[row]?.[col];
      if (!tileId) continue;
      const face = tileFieldCanvas(tileId, col, row);
      ctx.drawImage(
        face,
        0,
        0,
        face.width,
        face.height,
        col * GROUND_RES,
        row * GROUND_RES,
        GROUND_RES,
        GROUND_RES,
      );
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
  // false when this ground was baked before the sheet images had decoded — its
  // tiles are transparent placeholders (black ground). The renderer recomposes
  // once sheetsAreReady() flips true so a slow deployed build self-heals.
  bakedReady: boolean;
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
  private inspectionSerials = new Map<number, number>();

  sync(world: World, scene: Scene, camera: PerspectiveCamera): void {
    this.syncGround(world, scene);
    this.syncEntities(world, scene);
    this.syncCamera(world, camera);
  }

  private syncGround(world: World, scene: Scene): void {
    const runtime = world.get(MapRuntime);
    if (!runtime || runtime.mapId === "") return;
    // skip recompose when the cached ground still matches AND it was baked with
    // the sheet images present. A ground baked before the sheets decoded (slow
    // deployed build) has bakedReady=false and re-bakes EVERY frame until the
    // sheets are ready — so it heals from black incrementally as the terrain
    // PNGs arrive (sheetImages populates per-image), not only after every last
    // sheet (incl. audio) finishes. The fix for the deployed black-terrain race.
    const stillValid =
      this.ground &&
      this.ground.mapId === runtime.mapId &&
      this.ground.rev === runtime.rev &&
      this.ground.bakedReady;
    if (stillValid) return;
    if (this.ground) {
      scene.remove(this.ground.mesh);
      disposeGroundMesh(this.ground.mesh);
    }
    const canvas = composeGround(world);
    // the plane is in WORLD units (cols×TILE) to match entity coords; the
    // supersampled texture is mapped across it, so detail rises without moving
    // anything off the ground
    const worldW = runtime.cols * TILE;
    const worldH = runtime.rows * TILE;
    const mesh = new Mesh(
      new PlaneGeometry(worldW, worldH),
      createDioramaMaterial(textureFor(canvas), { role: "ground" }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldW / 2, 0, worldH / 2);
    scene.add(mesh);
    this.ground = {
      mapId: runtime.mapId,
      rev: runtime.rev,
      mesh,
      bakedReady: sheetsAreReady(),
    };
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
      const pose = spritePose(world, entity, ref.spriteId);
      const id = entity as unknown as number;
      const dir = entity.get(Facing)?.dir ?? 1;
      const intent = entity.get(MoveIntent);
      const moving = !!intent && (intent.x !== 0 || intent.y !== 0);
      const spriteDef = getSprite(ref.spriteId);

      let canvas: HTMLCanvasElement;
      let key: string;
      let translateY = 0;
      let sheetMirror = false;
      if (isSheetSprite(spriteDef)) {
        // purchased sheets carry direction + frame cycles in their own
        // pixels: the resolver reads sim state, the strip does the rest
        const frame = resolveSheetFrame(spriteDef, {
          pose,
          choreoPhase: entity.get(Choreo)?.phase ?? "",
          facingDir: dir >= 0 ? 1 : -1,
          moveX: intent?.x ?? 0,
          moveY: intent?.y ?? 0,
          t: world.get(Clock)?.t ?? 0,
        });
        sheetMirror = frame.mirror;
        if (flashing) {
          // white-silhouette feedback works for sheets too (flash bakes
          // from the sprite's static idle frame)
          canvas = flashCanvas(ref.spriteId, ref.paletteId);
          key = `${ref.spriteId}|${ref.paletteId}|flash`;
        } else {
          canvas = sheetFrameCanvas(spriteDef, frame);
          key = `${ref.spriteId}|${frame.anim.image}|${frame.sourceX},${frame.sourceY}`;
        }
      } else {
        canvas = flashing
          ? flashCanvas(ref.spriteId, ref.paletteId)
          : spriteCanvas(ref.spriteId, ref.paletteId, pose);
        key = `${ref.spriteId}|${ref.paletteId}|${flashing ? "flash" : pose}`;
        const channels = playMotion(
          id,
          moving ? (spriteDef.animations.walk ?? null) : (spriteDef.animations.idle ?? null),
        );
        translateY = channels.translateY;
      }
      const tracked = this.billboard(canvas, key, id, scene);
      tracked.mesh.position.set(t.x, canvas.height / 2 - translateY, t.y);
      const pulse = threatScale(world, entity);
      // directional sheets face in pixels; side-view sheets mirror on demand
      tracked.mesh.scale.x = (isSheetSprite(spriteDef) ? (sheetMirror ? -1 : 1) : dir) * pulse;
      tracked.mesh.scale.y = pulse;
      const spriteMaterial = tracked.mesh.material as ShaderMaterial;
      if (spriteMaterial.uniforms?.uAlpha) {
        spriteMaterial.uniforms.uAlpha.value = iframeAlpha(world, entity);
      }
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
      const pulse = entity.get(InspectionPulse);
      const previousSerial = this.inspectionSerials.get(id) ?? 0;
      if (pulse && pulse.serial !== previousSerial) {
        restartMotion(id, pulse.anim);
        this.inspectionSerials.set(id, pulse.serial);
      }
      const channels = pulse ? channelsOf(id) : null;
      tracked.mesh.position.set(t.x, canvas.height / 2 - (channels?.translateY ?? 0), t.y);
      const material = tracked.mesh.material as ShaderMaterial;
      if (material.uniforms.uAlpha) material.uniforms.uAlpha.value = channels?.alpha ?? 1;
      seen.add(id);
    }

    for (const entity of world.query(Transform, IsPickup)) {
      const t = entity.get(Transform);
      const info = entity.get(IsPickup);
      if (!t || !info) continue;
      const id = entity as unknown as number;
      let tracked = this.meshes.get(id);
      if (!tracked) {
        const spriteId = getItem(info.itemId).pickup?.sprite;
        if (!spriteId) throw new Error(`${info.itemId} pickup has no authored sprite`);
        const canvas = spriteCanvas(spriteId, "palette:base");
        const mesh = new Mesh(
          new PlaneGeometry(canvas.width, canvas.height),
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
        const spriteId = combat.projectileSprites[p.type as keyof typeof combat.projectileSprites];
        if (!spriteId) throw new Error(`projectile type ${p.type} has no authored sprite`);
        const canvas = spriteCanvas(spriteId, "palette:base");
        const mesh = new Mesh(
          new PlaneGeometry(canvas.width, canvas.height),
          createDioramaMaterial(textureFor(canvas), { role: "spark" }),
        );
        mesh.rotation.x = engine.stage.billboardTilt;
        scene.add(mesh);
        tracked = { mesh, textureKey: p.type };
        this.meshes.set(id, tracked);
      }
      if (p.type === "arrow") tracked.mesh.scale.x = p.vx >= 0 ? 1 : -1;
      tracked.mesh.position.set(t.x, 7, t.y);
      seen.add(id);
    }

    for (const entity of world.query(Transform, FxBurst)) {
      const t = entity.get(Transform);
      const fx = entity.get(FxBurst);
      if (!t || !fx || fx.total <= 0) continue;
      const id = entity as unknown as number;
      let tracked = this.meshes.get(id);
      if (!tracked) {
        const canvas =
          fx.kind === "dissolve"
            ? flashCanvas(fx.spriteId, fx.paletteId)
            : spriteCanvas(fx.spriteId, fx.paletteId);
        // trail ghosts reuse the projectile's own sprite at fading alpha
        const mesh = new Mesh(
          new PlaneGeometry(canvas.width, canvas.height),
          createDioramaMaterial(textureFor(canvas), { role: "spark" }),
        );
        mesh.rotation.x = engine.stage.billboardTilt;
        mesh.scale.x = fx.dir >= 0 ? 1 : -1;
        scene.add(mesh);
        tracked = { mesh, textureKey: `${fx.kind}|${fx.spriteId}` };
        this.meshes.set(id, tracked);
      }
      const progress = 1 - fx.left / fx.total;
      const fade = fx.left / fx.total;
      const material = tracked.mesh.material as ShaderMaterial;
      if (material.uniforms.uAlpha) {
        // each feel-fx has its own opacity envelope: trails ghost faint, the
        // wither haze sits low and steady, the rest ease out as they finish
        const alpha =
          fx.kind === "trail"
            ? fade * 0.6
            : fx.kind === "wither"
              ? Math.min(0.7, fade * 1.4)
              : fx.kind === "heal" || fx.kind === "puff"
                ? Math.sin(fade * Math.PI) // bloom in then out
                : fade;
        material.uniforms.uAlpha.value = alpha;
      }
      // the deploy puff and the blade arc grow as they play; the others hold
      const grow =
        fx.kind === "puff" ? 1 + progress * 0.6 : fx.kind === "arc" ? 0.6 + progress * 0.8 : 1;
      tracked.mesh.scale.x = (fx.dir >= 0 ? 1 : -1) * grow;
      tracked.mesh.scale.y = grow;
      const rise =
        fx.kind === "dissolve"
          ? progress * combat.feedback.dissolveFxRise
          : fx.kind === "heal"
            ? progress * 6 // the heal glow lifts off the mended ally
            : 0;
      const height = fx.kind === "trail" ? 7 : fx.kind === "wither" ? 4 : 9;
      tracked.mesh.position.set(t.x, height + rise, t.y);
      seen.add(id);
    }

    for (const [id, tracked] of [...this.meshes]) {
      if (!seen.has(id)) {
        scene.remove(tracked.mesh);
        tracked.mesh.geometry.dispose();
        // uMap textures are deliberately NOT disposed here: textureFor caches
        // one CanvasTexture per atlas canvas, shared across meshes — bounded
        // by the content set, not entity churn.
        (tracked.mesh.material as ShaderMaterial).dispose();
        releaseMotion(id);
        this.inspectionSerials.delete(id);
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

/** Live HD-2D game renderer: reconciles Koota world state to billboards and ground plane per frame. */
export function GameStage({ world }: { world: World }) {
  // idempotent; sheet frames blit transparent until decode completes
  void preloadSheetImages();
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
