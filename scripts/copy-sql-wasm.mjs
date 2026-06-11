import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/sql.js/dist/sql-wasm.wasm");
const target = resolve(root, "public/assets/sql-wasm.wasm");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const bytes = statSync(target).size;
if (bytes < 100_000) {
  throw new Error(`copied sql-wasm.wasm is unexpectedly small: ${bytes} bytes`);
}

console.log(`copied sql-wasm.wasm (${bytes} bytes)`);
