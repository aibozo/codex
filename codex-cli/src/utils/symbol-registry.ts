/**
 * Symbol Registry (stub)
 * ---------------------
 * A very small in-memory cache that maps fully-qualified symbol names to their
 * source locations. Meant as a quick-win helper for code generation — not a
 * replacement for the full symbol graph coming in Phase 3.
 *
 * Implementation notes:
 * • The cache is local to the Node process and **not persisted**.
 * • We do a best-effort text search over the workspace using `grep -R` (or
 *   an internal line-by-line scan) when a symbol is first requested.
 * • Lookups are case-sensitive. Languages that are case-insensitive should
 *   normalise before calling this API.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export interface Location {
  file: string;
  line: number; // 1-based
  column: number; // 1-based (best effort)
}

const MAX_CACHE_SIZE = 1000;

// Simple FIFO cache implemented with Map preserving insertion order.
const cache: Map<string, Location> = new Map();

// Allow users to disable the registry via env var for debugging.
const DISABLED = Boolean(process.env.CODEX_SYMBOL_REGISTRY_DISABLE);

/**
 * Public: Lookup a symbol by Fully-Qualified Name (language-specific).
 */
export function lookup(fqn: string, root: string = process.cwd()): Location | undefined {
  if (DISABLED) return undefined;

  const hit = cache.get(fqn);
  if (hit) return hit;

  const loc = searchSymbol(fqn, root);
  if (loc) {
    cacheSet(fqn, loc);
  }
  return loc;
}

/**
 * Public: Return a list of cached symbols that start with the given prefix.
 * This is **only** based on the in-memory cache, keeping it O(#cached).
 */
export function complete(prefix: string): string[] {
  if (DISABLED) return [];
  const res: string[] = [];
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) res.push(key);
    if (res.length >= 50) break; // arbitrary soft cap
  }
  return res;
}

function cacheSet(key: string, loc: Location): void {
  cache.set(key, loc);
  // Evict oldest entries if we exceed MAX_CACHE_SIZE
  if (cache.size > MAX_CACHE_SIZE) {
    const [first] = cache.keys();
    cache.delete(first);
  }
}

/**
 * Fallback text search when the symbol is not cached. We try `rg` (ripgrep)
 * first because it is fast; if not present, we walk the filesystem and perform
 * a naïve line-by-line search. This is **not** intended to be production-grade
 * but suffices for a stub.
 */
function searchSymbol(symbol: string, root: string): Location | undefined {
  // 1. Fast path: ripgrep JSON output
  if (commandExists("rg")) {
    const rgArgs = [
      "--json",
      "-n", // line numbers
      "-F", // fixed string match
      symbol,
      ".",
    ];
    const res = spawnSync("rg", rgArgs, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    if (res.status === 0 && res.stdout) {
      const lines = res.stdout.split(/\r?\n/);
      for (const ln of lines) {
        if (!ln.trim()) continue;
        try {
          const obj = JSON.parse(ln);
          if (obj.type === "match" && obj.data?.path?.text && obj.data.submatches?.length > 0) {
            const { path: p } = obj.data;
            const { line_number, start } = obj.data.submatches[0];
            return {
              file: path.resolve(root, p.text),
              line: line_number,
              column: start + 1,
            };
          }
        } catch {
          // ignore parse errors (non-JSON lines)
        }
      }
    }
  }

  // 2. Slow path: manual recursive scan (depth-first, limited to 5k files)
  let scanned = 0;
  const stack: string[] = [root];
  while (stack.length > 0 && scanned < 5000) {
    const dir = stack.pop()!;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue; // skip dot files / dirs
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        scanned += 1;
        const content = fs.readFileSync(full, "utf8");
        const idx = content.indexOf(symbol);
        if (idx !== -1) {
          const before = content.slice(0, idx);
          const line = before.split(/\r?\n/).length;
          const lastLine = before.lastIndexOf("\n");
          const col = idx - (lastLine === -1 ? 0 : lastLine + 1) + 1;
          return { file: full, line, column: col };
        }
      }
    }
  }
  return undefined;
}

function commandExists(cmd: string): boolean {
  const res = spawnSync("which", [cmd], { stdio: "ignore" });
  return res.status === 0;
}

// ---------------------------------------------------------------------------
// Module self-test (runs when executed directly, not when imported)
// ---------------------------------------------------------------------------

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sym = process.argv[2];
  if (!sym) {
    console.error("Usage: ts-node symbol-registry.ts <symbol>");
    process.exit(1);
  }
  console.log(lookup(sym));
}
