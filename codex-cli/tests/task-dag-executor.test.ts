import { expect, test, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

import { executePlan } from "../src/utils/task-dag-executor.js";

const tmpDir = path.join(process.cwd(), "tmp-plan-tests");

beforeEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
});

function writePlan(content: string): string {
  const p = path.join(tmpDir, "plan.yaml");
  fs.writeFileSync(p, content);
  return p;
}

test("executor marks tasks done and failed", async () => {
  const planPath = writePlan(`objective_id: obj\ntasks:\n  - task_id: a\n    check_cmd: "true"\n  - task_id: b\n    deps: [a]\n    check_cmd: "false"`);

  const failed = await executePlan(planPath, { concurrency: 2 });
  expect(failed).toBe(1);

  const txt = fs.readFileSync(planPath, "utf8");
  expect(txt.includes("status: done")).toBe(true);
  expect(txt.includes("status: failed")).toBe(true);
});

test("concurrency speeds up parallel tasks", async () => {
  const plan = writePlan(`objective_id: obj\ntasks:\n  - task_id: a\n    check_cmd: "sleep 0.4"\n  - task_id: b\n    check_cmd: "sleep 0.4"`);

  const t0 = Date.now();
  await executePlan(plan, { concurrency: 1, timeoutMs: 2000 });
  const serialDur = Date.now() - t0;

  const t1 = Date.now();
  await executePlan(plan, { concurrency: 2, timeoutMs: 2000 });
  const concDur = Date.now() - t1;

  expect(concDur).toBeLessThan(serialDur);
});
