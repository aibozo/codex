import { expect, test, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

import { executePlan } from "../src/utils/task-dag-executor.js";

const tmp = path.join(process.cwd(), "tmp-repair-test");

beforeEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  spawnSync("git", ["init"], { cwd: tmp });
  fs.writeFileSync(path.join(tmp, "file.txt"), "hello\n");
  spawnSync("git", ["add", "file.txt"], { cwd: tmp });
  spawnSync("git", ["commit", "-m", "init"], {
    cwd: tmp,
    env: { GIT_AUTHOR_NAME: "a", GIT_AUTHOR_EMAIL: "a@a", GIT_COMMITTER_NAME: "a", GIT_COMMITTER_EMAIL: "a@a" },
  });
});

test("failed git apply adds repair task", async () => {
  const badPatch = `diff --git a/nonexistent.txt b/nonexistent.txt\nindex e69de29..4b825dc 100644\n--- a/nonexistent.txt\n+++ b/nonexistent.txt\n@@\n+foo\n`;
  const patchPath = path.join(tmp, "bad.patch");
  fs.writeFileSync(patchPath, badPatch);

  const planPath = path.join(tmp, "plan.yaml");
  fs.writeFileSync(
    planPath,
    `objective_id: obj\ntasks:\n  - task_id: apply\n    check_cmd: "git apply ${patchPath}"\n`,
  );

  await executePlan(planPath, { concurrency: 1, timeoutMs: 10000 });

  const txt = fs.readFileSync(planPath, "utf8");
  expect(txt.includes("status: failed")).toBe(true);
  expect(/auto-fix-/.test(txt)).toBe(true);
});
