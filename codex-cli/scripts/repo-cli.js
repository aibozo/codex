#!/usr/bin/env node
import { loadRepoState, classifyRepo } from "../src/utils/repo-classifier.js";

const sub = process.argv[2];

if (sub === "state") {
  const s = loadRepoState();
  if (!s) {
    console.log("state: unknown");
  } else {
    console.log(`state: ${s.label} (conf ${s.confidence.toFixed(2)})`);
  }
  process.exit(0);
}

if (sub === "classify") {
  const s = classifyRepo();
  console.log(`classified: ${s.label} (conf ${s.confidence.toFixed(2)})`);
  process.exit(0);
}

console.log("Usage: codex-repo <state|classify>");
process.exit(1);
