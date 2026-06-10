/**
 * The world stage: HD-2D staging per docs/ARCHITECTURE.md §Renderer.
 * Perspective camera pitched over a nearest-filtered ground plane; actors
 * are upright billboards anchored at their feet. Fixed yaw — the camera
 * never rotates in normal play.
 */
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { CanvasTexture, NearestFilter, type PerspectiveCamera, SRGBColorSpace } from "three";

export function pixelTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export interface StageActor {
  id: string;
  canvas: HTMLCanvasElement;
  /** World px; y is the feet line (ground contact / depth key). */
  x: number;
  y: number;
  flip?: boolean;
}

export interface StageProps {
  groundCanvas: HTMLCanvasElement;
  /** Ground size in world px (1 texel = 1 world unit). */
  worldW: number;
  worldH: number;
  actors: StageActor[];
  width?: number;
  height?: number;
}

const BILLBOARD_TILT = -0.32;

function Ground({
  canvas,
  worldW,
  worldH,
}: {
  canvas: HTMLCanvasElement;
  worldW: number;
  worldH: number;
}) {
  const texture = useMemo(() => pixelTexture(canvas), [canvas]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[worldW / 2, 0, worldH / 2]}>
      <planeGeometry args={[worldW, worldH]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Billboard({ actor }: { actor: StageActor }) {
  const texture = useMemo(() => pixelTexture(actor.canvas), [actor]);
  const w = actor.canvas.width;
  const h = actor.canvas.height;
  return (
    <mesh
      position={[actor.x, h / 2, actor.y]}
      rotation={[BILLBOARD_TILT, 0, 0]}
      scale={[actor.flip ? -1 : 1, 1, 1]}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.5} toneMapped={false} />
    </mesh>
  );
}

export function Stage({
  groundCanvas,
  worldW,
  worldH,
  actors,
  width = 720,
  height = 480,
}: StageProps) {
  return (
    <div data-testid="world-stage" style={{ width, height }}>
      <Canvas
        dpr={1}
        gl={{ antialias: false }}
        flat
        camera={{
          fov: 38,
          near: 1,
          far: 2000,
          position: [worldW / 2, 250, worldH + 190],
        }}
        onCreated={({ camera, gl }) => {
          (camera as PerspectiveCamera).lookAt(worldW / 2, 0, worldH / 2 - 20);
          gl.domElement.dataset.ready = "1";
        }}
      >
        <color attach="background" args={["#141013"]} />
        <Ground canvas={groundCanvas} worldW={worldW} worldH={worldH} />
        {actors.map((actor) => (
          <Billboard key={actor.id} actor={actor} />
        ))}
      </Canvas>
    </div>
  );
}
