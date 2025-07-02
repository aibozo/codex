import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";
import yaml from "js-yaml";

import { DATA_DIR as CODATA } from "./symbol-graph.js";

const SPEC_DIR = path.join(CODATA, "repair-specs");
const DATA_DIR_TMP = path.join(CODATA, "tmp");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function validatePatch(patchText, repoRoot = process.cwd(), opts = {}) {
  ensureDir(SPEC_DIR);

  ensureDir(DATA_DIR_TMP);
  const tmpPatch = path.join(DATA_DIR_TMP, `patch-${Date.now()}.patch`);
  fs.writeFileSync(tmpPatch, patchText);

  const res = spawnSync("git", ["apply", "--check", tmpPatch], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  try {
    fs.unlinkSync(tmpPatch);
  } catch {
    /* ignore missing */
  }

  if (res.status === 0) return { ok: true };

  const stderr = res.stderr || "";

  const spec = buildRepairSpec(stderr);
  const id = crypto.randomUUID();
  const specPath = path.join(SPEC_DIR, `${id}.yaml`);
  ensureDir(SPEC_DIR);
  fs.writeFileSync(specPath, yaml.dump(spec), "utf8");

  return { ok: false, specPath };
}

export function validatePatchFile(filePath, repoRoot = process.cwd()) {
  const txt = fs.readFileSync(filePath, "utf8");
  return validatePatch(txt, repoRoot);
}

function buildRepairSpec(stderr) {
  const lines = stderr.split(/\r?\n/);

  for (const ln of lines) {
    if (/symbol.*not found/i.test(ln)) {
      const m = ln.match(/'([^']+)'/);
      return { kind: "missing_symbol", symbol: m ? m[1] : "", raw: ln };
    }
    if (/patch.*failed/i.test(ln) || /already exists in working tree/i.test(ln)) {
      return { kind: "merge_conflict", raw: ln };
    }
  }
  return { kind: "unknown", raw: stderr.trim() };
}
