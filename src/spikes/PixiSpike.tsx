/**
 * S2.2 candidate A: pixi.js v8, classic top-down 2D at its best —
 * integer-scaled nearest-neighbor tiles, y-sorted actors. The 2D baseline
 * the 2.5D candidate must beat.
 */
import { Application, Container, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";
import { buildActors, composeMapSliceCanvas, SLICE_H, SLICE_W } from "./spikeScene";

const VIEW_W = 720;
const VIEW_H = 480;

function textureFrom(canvas: HTMLCanvasElement): Texture {
  const texture = Texture.from(canvas);
  texture.source.scaleMode = "nearest";
  return texture;
}

export function PixiSpike() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let app: Application | undefined;
    let cancelled = false;
    (async () => {
      const candidate = new Application();
      await candidate.init({
        width: VIEW_W,
        height: VIEW_H,
        background: 0x141013,
        antialias: false,
      });
      if (cancelled || !hostRef.current) {
        candidate.destroy(true);
        return;
      }
      app = candidate;
      hostRef.current.appendChild(app.canvas);

      const world = new Container();
      const scale = 2; // 336×240 → 672×480, integer scale, centered
      world.scale.set(scale);
      world.position.set((VIEW_W - SLICE_W * scale) / 2, (VIEW_H - SLICE_H * scale) / 2);
      world.sortableChildren = true;
      app.stage.addChild(world);

      const map = new Sprite(textureFrom(composeMapSliceCanvas()));
      map.zIndex = -1;
      world.addChild(map);

      for (const actor of buildActors()) {
        const sprite = new Sprite(textureFrom(actor.canvas));
        sprite.anchor.set(0.5, 1);
        sprite.position.set(actor.x, actor.y);
        sprite.zIndex = actor.y;
        if (actor.flip) sprite.scale.x = -1;
        world.addChild(sprite);
      }

      app.render();
      (app.canvas as HTMLCanvasElement).dataset.ready = "1";
    })();
    return () => {
      cancelled = true;
      app?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} data-testid="pixi-spike" />;
}
