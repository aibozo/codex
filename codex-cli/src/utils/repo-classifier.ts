import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

export type RepoLabel = "greenfield" | "feature" | "bugfix" | "refactor";

export interface RepoState {
  label: RepoLabel;
  confidence: number; // 0..1
  updated_ts: number;
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..", "..");
const DATA_FILE = path.join(repoRoot, "codex-data", "repo-state.json");

function runGit(args: string[]): string {
  const res = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  return res.stdout.trim();
}

export function classifyRepo(): RepoState {
  // heuristic: recent commit count and average files per commit
  const log = runGit(["log", "--since=7.days", "--pretty=format:%h", "--name-only"]);
  if (!log) {
    return saveState({ label: "greenfield", confidence: 0.9 });
  }

  const commits = log.split(/\n(?=\w{7})/).filter(Boolean);
  const commitCount = commits.length;
  let totalFiles = 0;
  for (const c of commits) {
    totalFiles += c.split(/\n/).slice(1).filter(Boolean).length;
  }
  const avgFiles = commitCount ? totalFiles / commitCount : 0;

  let label: RepoLabel = "feature";
  if (avgFiles < 2 && commitCount < 5) label = "bugfix";
  else if (avgFiles > 20) label = "refactor";

  const confidence = Math.min(1, commitCount / 10 + avgFiles / 100);
  return saveState({ label, confidence });
}

function saveState(state: Omit<RepoState, "updated_ts">): RepoState {
  const full: RepoState = { ...state, updated_ts: Date.now() };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(full, null, 2));
  return full;
}

export function loadRepoState(): RepoState | null {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return null;
  }
}
