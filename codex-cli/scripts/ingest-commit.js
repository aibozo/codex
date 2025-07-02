#!/usr/bin/env node
/*
 * Ingest latest Git commit into Codex memory store.
 * ------------------------------------------------
 * Runs as a post-commit hook.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { addTriple } from "../src/utils/memory-store.js";

// Resolve repo root (git rev-parse)
const resRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
});
if (resRoot.status !== 0) {
  process.exit(0); // not a git repo
}

const repoRoot = resRoot.stdout.trim();

// Get commit SHA (HEAD)
const resSha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
const commitSha = resSha.stdout.trim();

// Gather changed files in the commit
const lsRes = spawnSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], {
  encoding: "utf8",
});

if (lsRes.status !== 0) {
  process.exit(0);
}

const files = lsRes.stdout.split(/\r?\n/).filter(Boolean);

for (const relPath of files) {
  const absPath = path.join(repoRoot, relPath);
  // Only process existing files (ignore deletions)
  if (!fs.existsSync(absPath)) continue;

  // Record modification triple
  addTriple({ subject: relPath, predicate: "modified_in", object: commitSha });

  const content = fs.readFileSync(absPath, "utf8");
  const imports = extractImports(relPath, content);
  for (const imp of imports) {
    addTriple({ subject: relPath, predicate: "imports", object: imp });
  }
}

function extractImports(filePath, src) {
  const ext = path.extname(filePath);
  const matches = new Set();

  const push = (val) => {
    if (val) matches.add(val);
  };

  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
    const regex = /import\s+[^'"`]*['"`]([^'"`]+)['"`]|require\(['"`]([^'"`]+)['"`]\)/g;
    let m;
    while ((m = regex.exec(src))) {
      push(m[1] || m[2]);
    }
  } else if (ext === ".py") {
    const regex = /^\s*(?:from|import)\s+([a-zA-Z0-9_.]+)/gm;
    let m;
    while ((m = regex.exec(src))) push(m[1]);
  } else if (ext === ".rs") {
    const regex = /^\s*use\s+([a-zA-Z0-9_:]+)/gm;
    let m;
    while ((m = regex.exec(src))) push(m[1]);
  }
  return Array.from(matches);
}
