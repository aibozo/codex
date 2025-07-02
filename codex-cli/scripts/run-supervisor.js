#!/usr/bin/env node
// Detached supervisor runner used by `codex fleet start`.

import path from "path";
import { fileURLToPath } from "url";

import { Supervisor } from "../src/utils/agent/supervisor.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const planPath = process.argv[2];
if (!planPath) {
  // eslint-disable-next-line no-console
  console.error("Usage: run-supervisor.js <plan.yaml>");
  process.exit(1);
}

const sup = new Supervisor(repoRoot, path.resolve(planPath));
sup.start();

process.on("SIGTERM", () => {
  sup.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  sup.stop();
  process.exit(0);
});

// keep process alive
setInterval(() => {}, 1 << 30);
