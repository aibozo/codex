import { expect, test, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { validatePatch } from "../src/utils/patch-validator.js";

const tmpDir = path.join(process.cwd(), "tmp-validate-tests");

beforeEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  spawnSync("git", ["init"], { cwd: tmpDir });
  fs.writeFileSync(path.join(tmpDir, "README.md"), "hello\n");
  spawnSync("git", ["add", "README.md"], { cwd: tmpDir });
  spawnSync("git", ["commit", "-m", "init"], { cwd: tmpDir, env: { GIT_AUTHOR_NAME: "x", GIT_AUTHOR_EMAIL: "x@x", GIT_COMMITTER_NAME: "x", GIT_COMMITTER_EMAIL: "x@x" } });
});

test("validatePatch detects failing patch", () => {
  const badPatch = `diff --git a/nonexistent.txt b/nonexistent.txt\nindex e69de29..4b825dc 100644\n--- a/nonexistent.txt\n+++ b/nonexistent.txt\n@@\n+foo\n`;
  const res = validatePatch(badPatch, tmpDir);
  expect(res.ok).toBe(false);
  expect(fs.existsSync(res.specPath)).toBe(true);
});
