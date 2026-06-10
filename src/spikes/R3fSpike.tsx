/**
 * S2.2 candidate B: @react-three/fiber 2.5D extrapolation — FF7-era staging:
 * perspective camera pitched over a textured ground plane, pixel sprites as
 * upright billboards that scale naturally with depth, z-buffer giving free
 * y-sorting. Same content as the pixi spike.
 */
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import { CanvasTexture, NearestFilter, type PerspectiveCamera, SRGBColorSpace } from "three";
import {
  buildActors,
  composeMapSliceCanvas,
  SLICE_H,
  SLICE_W,
  type SpikeActor,
} from "./spikeScene";

function pixelTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function Ground() {
  const texture = useMemo(() => pixelTexture(composeMapSliceCanvas()), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[SLICE_W / 2, 0, SLICE_H / 2]}>
      <planeGeometry args={[SLICE_W, SLICE_H]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function Billboard({ actor }: { actor: SpikeActor }) {
  const texture = useMemo(() => pixelTexture(actor.canvas), [actor]);
  const w = actor.canvas.width;
  const h = actor.canvas.height;
  return (
    <mesh
      position={[actor.x, h / 2, actor.y]}
      rotation={[-0.32, 0, 0]}
      scale={[actor.flip ? -1 : 1, 1, 1]}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.5} toneMapped={false} />
    </mesh>
  );
}

export function R3fSpike() {
  const actors = useMemo(buildActors, []);
  return (
    <div data-testid="r3f-spike" style={{ width: 720, height: 480 }}>
      <Canvas
        dpr={1}
        gl={{ antialias: false }}
        flat
        camera={{ fov: 38, near: 1, far: 2000, position: [SLICE_W / 2, 250, SLICE_H + 190] }}
        onCreated={({ camera, gl }) => {
          (camera as PerspectiveCamera).lookAt(SLICE_W / 2, 0, SLICE_H / 2 - 20);
          gl.domElement.dataset.ready = "1";
        }}
      >
        <color attach="background" args={["#141013"]} />
        <Ground />
        {actors.map((actor) => (
          <Billboard key={actor.name} actor={actor} />
        ))}
      </Canvas>
    </div>
  );
}
