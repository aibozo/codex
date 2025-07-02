import { expect, test, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

import { ensureAllowed } from "../src/utils/guardrails.js";

const repoRoot = path.resolve(process.cwd(), "..");
const stateFile = path.join(repoRoot, "codex-data", "repo-state.json");

beforeEach(() => {
  // Ensure repo-state.json is cleared without removing other codex-data
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
});

test("bugfix blocks plan", () => {
  fs.writeFileSync(stateFile, JSON.stringify({ label: "bugfix", confidence: 0.8 }));
  expect(() => ensureAllowed("plan")).toThrow();
});

test("override bypasses guardrail", () => {
  fs.writeFileSync(stateFile, JSON.stringify({ label: "bugfix", confidence: 0.8 }));
  process.env.CODEX_OVERRIDE_STATE = "bugfix";
  expect(() => ensureAllowed("plan")).not.toThrow();
  delete process.env.CODEX_OVERRIDE_STATE;
});
