import { expect, test, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

import { Supervisor } from "../src/utils/agent/supervisor";

const repo = path.resolve(process.cwd(), "..");

const planA = path.join(repo, "plan-route-a.yaml");
const planB = path.join(repo, "plan-route-b.yaml");

beforeEach(() => {
  fs.writeFileSync(
    planA,
    `objective_id: a\ntasks:\n  - task_id: t1\n    executor: patch-bot\n    check_cmd: "echo hi"`,
  );
  fs.writeFileSync(
    planB,
    `objective_id: b\ntasks:\n  - task_id: t1\n    executor: non-existent\n    check_cmd: "echo hi"`,
  );
});

test.skip(
  "task with matching executor dispatched",
  async () => {
  const sup = new Supervisor(repo, planA);
  sup.start();
    // wait up to 15s for status done
    const start = Date.now();
    let done = false;
    while (Date.now() - start < 15000) {
      const txt = fs.readFileSync(planA, "utf8");
      if (txt.includes("status: done")) { done = true; break; }
      await new Promise((r) => setTimeout(r, 300));
    }
    sup.stop();
    expect(done).toBe(true);
  },
  20000,
);

test(
  "task with unknown executor stays todo",
  async () => {
  const sup = new Supervisor(repo, planB);
  sup.start();
    await new Promise((r) => setTimeout(r, 5000));
    sup.stop();
    const txt = fs.readFileSync(planB, "utf8");
    expect(txt.includes("status: running")).toBe(false);
    expect(txt.includes("status: done")).toBe(false);
  },
  20000,
);
