import { Color, DoubleSide, ShaderMaterial, type Texture } from "three";

/** Diorama vertex shader: passes UV and world position to fragment shader. */
export const DIORAMA_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

/** Diorama fragment shader: renders vellum-paper texture with relief, grain, and per-role lighting. */
export const DIORAMA_FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform vec3 uVellumLight;
  uniform vec3 uInkWash;
  uniform float uRelief;
  uniform float uPaperGrain;
  uniform float uAlpha;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float manuscriptHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec4 texel = texture2D(uMap, vUv);
    if (texel.a < 0.08) discard;

    float vellumFalloff = clamp((1.0 - vUv.y) * 0.62 + vUv.x * 0.12, 0.0, 1.0);
    float lowerShade = smoothstep(0.48, 1.0, vUv.y);
    float sideShade = smoothstep(0.88, 0.12, vUv.x);
    float relief = clamp(uRelief, 0.0, 1.0);

    vec3 color = texel.rgb;
    color *= mix(uInkWash, vec3(1.0), 0.86 + vellumFalloff * 0.1);
    color += uVellumLight * vellumFalloff * relief * 0.08;
    color = mix(color, color * (0.9 + sideShade * 0.08), lowerShade * relief * 0.38);

    float grain = manuscriptHash(gl_FragCoord.xy + floor(vWorldPosition.xz)) - 0.5;
    color += grain * uPaperGrain;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a * uAlpha);
  }
`;

type DioramaMaterialRole = "ground" | "sprite" | "spark";

interface DioramaMaterialOptions {
  role: DioramaMaterialRole;
  alpha?: number;
  vellumLight?: string;
  inkWash?: string;
  paperGrain?: number;
}

const RELIEF_BY_ROLE: Record<DioramaMaterialRole, number> = {
  ground: 0.58,
  sprite: 0.38,
  spark: 0.24,
};

/** Build a role-tuned diorama material (ground/sprite/spark relief). */
export function createDioramaMaterial(
  texture: Texture,
  {
    role,
    alpha = 1,
    vellumLight = "#f2d391",
    inkWash = "#6c5a3d",
    paperGrain = role === "ground" ? 0.018 : 0.009,
  }: DioramaMaterialOptions,
): ShaderMaterial {
  const material = new ShaderMaterial({
    name: `ErrantStorybook:${role}`,
    uniforms: {
      uMap: { value: texture },
      uVellumLight: { value: new Color(vellumLight) },
      uInkWash: { value: new Color(inkWash) },
      uRelief: { value: RELIEF_BY_ROLE[role] },
      uPaperGrain: { value: paperGrain },
      uAlpha: { value: alpha },
    },
    vertexShader: DIORAMA_VERTEX_SHADER,
    fragmentShader: DIORAMA_FRAGMENT_SHADER,
    transparent: role !== "ground" || alpha < 1,
    depthWrite: role === "ground",
    side: DoubleSide,
    toneMapped: false,
  });
  return material;
}

/** Update the texture uniform on a diorama material and mark it for update. */
export function setDioramaTexture(material: ShaderMaterial, texture: Texture): void {
  material.uniforms.uMap.value = texture;
  material.needsUpdate = true;
}
