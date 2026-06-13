/**
 * Resolve a public/assets/ path under the deployment base.
 *
 * The app ships with Vite `base: "./"` so one bundle serves from both the web
 * root and GitHub Pages' project subpath (`/a-good-old-fashioned-adventure/`).
 * An absolute `/assets/...` URL ignores that subpath and 404s on Pages — which
 * silently fell every sheet sprite/tile/font/audio file back to its procedural
 * placeholder. Resolving against `import.meta.env.BASE_URL` (Vite injects the
 * real base at build time) keeps the same code correct on both deployments.
 *
 * @param path a path under public/assets, WITHOUT a leading slash
 *   (e.g. "tilemaps/roguelike.png", "fonts/eb-garamond-400.ttf").
 */
export function assetUrl(path: string): string {
  // optional-chain import.meta.env — it can be undefined in non-Vite contexts
  // (some test runners / SSR), and accessing .BASE_URL on undefined would throw
  const base = import.meta.env?.BASE_URL ?? "/";
  // BASE_URL ends with a slash ("/" at root, "./" or "/sub/" otherwise); strip
  // it and any accidental leading slash on the path so neither doubles up
  return `${base.replace(/\/$/, "")}/assets/${path.replace(/^\//, "")}`;
}
