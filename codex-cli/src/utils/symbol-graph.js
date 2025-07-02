import fs from "fs";
import path from "path";
import ts from "typescript";

// ----------------------------------------------------------------------------
// Paths
// ----------------------------------------------------------------------------

// Project root is current working directory
const repoRoot = process.cwd();
export const DATA_DIR = path.join(repoRoot, "codex-data");
const GRAPH_FILE = path.join(DATA_DIR, "symbol-graph.jsonl");
const MTIME_CACHE = path.join(DATA_DIR, "symbol-graph.mtime.json");

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** @typedef {"function"|"class"|"interface"|"enum"|"variable"|"import"} SymbolKind */

/**
 * @typedef {Object} SymbolNode
 * @property {string} file   relative path
 * @property {string} symbol fully-qualified or simple name
 * @property {SymbolKind} kind
 * @property {number} line   1-based
 */

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** @param {SymbolNode} node */
export function addNode(node) {
  ensureDir();
  fs.appendFileSync(GRAPH_FILE, JSON.stringify(node) + "\n", "utf8");
}

export function clearGraph() {
  if (fs.existsSync(GRAPH_FILE)) fs.rmSync(GRAPH_FILE);
}

/** @returns {Iterable<SymbolNode>} */
export function *iterateNodes() {
  if (!fs.existsSync(GRAPH_FILE)) return;
  for (const ln of fs.readFileSync(GRAPH_FILE, "utf8").split(/\r?\n/)) {
    if (!ln) continue;
    try { yield JSON.parse(ln); } catch {/*ignore*/}
  }
}

export function graphStats() {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const n of iterateNodes()) {
    counts[n.kind] = (counts[n.kind] || 0) + 1;
  }
  return counts;
}

// ----------------------------------------------------------------------------
// TypeScript extractor
// ----------------------------------------------------------------------------

/**
 * @param {string} filePath
 * @param {string=} srcOverride
 * @returns {SymbolNode[]}
 */
export function extractTsFile(filePath, srcOverride) {
  const src = srcOverride ?? fs.readFileSync(filePath, "utf8");
  const rel = path.relative(repoRoot, filePath);
  const nodes = [];

  const sf = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true);

  /** @type {(kind: SymbolKind, name: string, pos: number) => void} */
  function add(kind, name, pos) {
    const { line } = sf.getLineAndCharacterOfPosition(pos);
    nodes.push({ file: rel, symbol: name, kind, line: line + 1 });
  }

  /** @param {import("typescript").Node} node */
  function walk(node) {
    if (ts.isFunctionDeclaration(node) && node.name) add("function", node.name.text, node.name.getStart());
    else if (ts.isClassDeclaration(node) && node.name) add("class", node.name.text, node.name.getStart());
    else if (ts.isInterfaceDeclaration(node)) add("interface", node.name.text, node.name.getStart());
    else if (ts.isEnumDeclaration(node)) add("enum", node.name.text, node.name.getStart());
    else if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((d) => {
        if (ts.isIdentifier(d.name)) add("variable", d.name.text, d.name.getStart());
      });
    } else if (ts.isImportDeclaration(node)) {
      const mod = node.moduleSpecifier.text;
      add("import", mod, node.moduleSpecifier.getStart());
    }
    ts.forEachChild(node, walk);
  }

  walk(sf);
  return nodes;
}

export function refreshGraphTs() {
  const prevMtimes = fs.existsSync(MTIME_CACHE) ? JSON.parse(fs.readFileSync(MTIME_CACHE, "utf8")) : {};

  // Start fresh each invocation to keep test expectations simple.
  clearGraph();

  const newMtimes = {};
  let count = 0;

  const files = listFiles(repoRoot, (f) => /\.(ts|tsx)$/.test(f));
  for (const f of files) {
    const mtime = fs.statSync(f).mtimeMs;
    newMtimes[f] = mtime;
    if (prevMtimes[f] && prevMtimes[f] === mtime) continue; // unchanged

    try {
      const nodes = extractTsFile(f);
      nodes.forEach((n) => addNode(n));
      count += nodes.length;
    } catch {
      /* ignore */
    }
  }
  fs.writeFileSync(MTIME_CACHE, JSON.stringify(newMtimes));
  return count;
}

function listFiles(dir, predicate) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFiles(full, predicate));
    else if (ent.isFile() && predicate(full)) out.push(full);
  }
  return out;
}
