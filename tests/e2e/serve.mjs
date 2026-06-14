/**
 * Minimal static server that maps the GitHub Pages project SUBPATH onto the
 * built `dist/`, so the Playwright E2E hits the exact deployed shape
 * (/a-good-old-fashioned-adventure/...). Used by playwright.config.ts webServer.
 */

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../dist", import.meta.url)));
// every served file must live strictly UNDER ROOT — guard with the path
// separator so a sibling like `<ROOT>-evil` can't pass a bare startsWith.
const ROOT_PREFIX = ROOT + sep;
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
    // resolve the request against ROOT, then require the result to sit under
    // ROOT_PREFIX — rejects `../` escapes and `<ROOT>-sibling` near-misses alike
    const file = resolve(ROOT, `.${sep}${path}`);
    if (file !== ROOT && !file.startsWith(ROOT_PREFIX)) {
      res.writeHead(403).end("traversal");
      return;
    }
    // single read; treat ENOENT/EISDIR (and any read failure) as 404 so there's
    // no stat→read TOCTOU window — the file is opened exactly once.
    const body = await readFile(file).catch(() => null);
    if (body === null) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
}).listen(PORT, () => console.log(`serving dist under http://localhost:${PORT}${SUBPATH}/`));
