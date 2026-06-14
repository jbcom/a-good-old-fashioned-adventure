/**
 * Minimal static server that maps the GitHub Pages project SUBPATH onto the
 * built `dist/`, so the Playwright E2E hits the exact deployed shape
 * (/a-good-old-fashioned-adventure/...). Used by playwright.config.ts webServer.
 */

import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../dist", import.meta.url));
const SUBPATH = "/a-good-old-fashioned-adventure";
const PORT = Number(process.argv[2] ?? 8911);
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (!path.startsWith(SUBPATH)) {
      res.writeHead(404).end("outside subpath");
      return;
    }
    path = path.slice(SUBPATH.length) || "/";
    if (path === "/" || path.endsWith("/")) path += "index.html";
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end("traversal");
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
}).listen(PORT, () => console.log(`serving dist under http://localhost:${PORT}${SUBPATH}/`));
