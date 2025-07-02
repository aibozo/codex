import { expect, test } from "vitest";
import fs from "fs";
import path from "path";

import { Supervisor } from "../src/utils/agent/supervisor";

function findRepo(start: string): string {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "agents"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

async function waitDone(file: string, ms = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (fs.readFileSync(file, "utf8").includes("status: done")) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("timeout");
}

test.skip(
  "Supervisor executes echo task",
  async () => {
    const repoRoot = findRepo(process.cwd());
    const planPath = path.join(repoRoot, "simple-plan.yaml");
    fs.writeFileSync(
      planPath,
      `objective_id: demo\ntasks:\n  - task_id: echo\n    check_cmd: "echo hi"`,
    );

    const sup = new Supervisor(repoRoot, planPath);
    sup.start();
    await waitDone(planPath, 10000);
    sup.stop();

    const txt = fs.readFileSync(planPath, "utf8");
    expect(txt.includes("status: done")).toBe(true);
  },
  20000,
);
