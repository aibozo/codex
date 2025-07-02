import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

export class GuardrailError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "GuardrailError";
  }
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
const STATE_FILE = path.join(repoRoot, "codex-data", "repo-state.json");

/** @typedef {"plan"|"run-plan"|"fleet-start"} Action */

export function ensureAllowed(action) {
  if (process.env.CODEX_OVERRIDE_STATE) return;
  if (!fs.existsSync(STATE_FILE)) return;
  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  const label = state.label || "greenfield";

  if (label === "bugfix" && action === "plan") {
    throw new GuardrailError(
      "Guardrail: Cannot create new multi-step plan in bugfix mode. Use --override-state to bypass.",
    );
  }

  if (label === "refactor" && action === "run-plan") {
    // allow but ensure branch
    maybeCreateRefactorBranch();
  }

  if (label === "refactor" && action === "fleet-start") {
    maybeCreateRefactorBranch();
  }
}

function maybeCreateRefactorBranch() {
  const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  if (branch === "main" || branch === "master") {
    const slug = new Date().toISOString().slice(0, 10);
    const newB = `refactor/${slug}`;
    runGit(["checkout", "-b", newB]);
    console.log("Created refactor branch", newB);
  }
}

function runGit(args) {
  return spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" }).stdout;
}

export function loadRepoState() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}