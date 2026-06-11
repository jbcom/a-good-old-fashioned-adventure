import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("rendering resource lifecycle", () => {
  it("disposes the generated ground CanvasTexture when replacing ground meshes", () => {
    const source = read("src/render/GameStage.tsx");

    expect(source).toContain("function disposeGroundMesh");
    expect(source).toContain("material.uniforms.uMap?.value");
    expect(source).toContain("?.dispose()");
  });
});
