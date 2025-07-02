/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * Memory Store – minimal JS backend (Phase 1)
 * -------------------------------------------
 * File-based JSON Lines store so we avoid native SQLite deps during early
 * prototyping. Public API matches the eventual SQLite + Chroma version.
 */

import fs from "fs";
import path from "path";

import { fileURLToPath } from "url";

const __dirnameEs = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirnameEs, "..", "..", "..");
export const DATA_DIR = path.join(repoRoot, "codex-data", "memory");
const TRIPLE_FILE = path.join(DATA_DIR, "kg.jsonl");
const VECTOR_FILE = path.join(DATA_DIR, "vectors.jsonl");

fs.mkdirSync(DATA_DIR, { recursive: true });

export function addTriple(rec) {
  // rec: {subject, predicate, object, ts?}
  const t = { ...rec, ts: rec.ts ?? Date.now() };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(TRIPLE_FILE, JSON.stringify(t) + "\n", "utf8");
}

export function findTriples(pattern = {}) {
  if (!fs.existsSync(TRIPLE_FILE)) return [];
  const lines = fs.readFileSync(TRIPLE_FILE, "utf8").split(/\r?\n/);
  const out = [];
  for (const ln of lines) {
    if (!ln) continue;
    let obj;
    try {
      obj = JSON.parse(ln);
    } catch {
      continue;
    }
    if (
      (pattern.subject && obj.subject !== pattern.subject) ||
      (pattern.predicate && obj.predicate !== pattern.predicate) ||
      (pattern.object && obj.object !== pattern.object)
    ) {
      continue;
    }
    out.push(obj);
  }
  return out;
}

export function addVector(r) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(VECTOR_FILE, JSON.stringify(r) + "\n", "utf8");
}

export function queryVector(query, topK = 5) {
  if (!fs.existsSync(VECTOR_FILE)) return [];
  const all = fs
    .readFileSync(VECTOR_FILE, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((ln) => {
      try {
        return JSON.parse(ln);
      } catch {
        return undefined;
      }
    })
    .filter(Boolean);

  const scored = all.map((r) => ({ r, dist: l2(query, r.embedding) }));
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, topK).map((s) => s.r);
}

// ---------------------------------------------------------------------------
// Utilities for tests / maintenance
// ---------------------------------------------------------------------------

export function clearMemoryStore() {
  try {
    if (fs.existsSync(TRIPLE_FILE)) fs.rmSync(TRIPLE_FILE);
    if (fs.existsSync(VECTOR_FILE)) fs.rmSync(VECTOR_FILE);
  } catch {
    // ignore
  }
}

function l2(a, b) {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function buildFocusWindow(k = 20, objectiveId = "") {
  const triples = findTriples();
  triples.sort((a, b) => b.ts - a.ts);

  const scored = triples.map((t, idx) => {
    let score = k - idx; // base score on recency rank (higher is better)
    const match =
      objectiveId &&
      (t.subject.includes(objectiveId) ||
        t.object.includes(objectiveId) ||
        t.predicate.includes(objectiveId));
    if (match) score += k * 10; // very strong boost
    return { t, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => ({
    source: "triple",
    snippet: `${s.t.subject} ${s.t.predicate} ${s.t.object}`,
    score: s.score,
  }));
}
