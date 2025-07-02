import { spawn } from "child_process";
import { performance } from "perf_hooks";
import fs from "fs";
import path from "path";

import {
  loadPlan,
  savePlan,
  topologicalSort,
  type Task,
  type Plan,
} from "./task-dag.js";

import { validatePatchFile } from "./patch-validator.js";

export interface ExecOptions {
  concurrency?: number; // default 4
  timeoutMs?: number; // per-task timeout, default 30m
  dryRun?: boolean;
}

export async function executePlan(
  planPath: string,
  opts: ExecOptions = {},
): Promise<number> {
  const plan = loadPlan(planPath);
  const { concurrency = 4, timeoutMs = 30 * 60_000, dryRun = false } = opts;

  // normalise task.status
  plan.tasks.forEach((t) => {
    if (!t.status) t.status = "todo";
  });

  const taskMap = new Map<string, Task>(plan.tasks.map((t) => [t.task_id, t]));

  const readyQueue: Task[] = [];
  const running = new Set<string>();

  function enqueueReady() {
    for (const task of plan.tasks) {
      if (task.status !== "todo") continue;
      if (running.has(task.task_id)) continue;
      const depsDone = !task.deps || task.deps.every((d) => taskMap.get(d)?.status === "done");
      if (depsDone && !readyQueue.includes(task)) readyQueue.push(task);
    }
  }

  enqueueReady();

  async function runTask(task: Task): Promise<boolean> {
    task.status = "running";
    savePlan(plan);

    if (dryRun || !task.check_cmd) {
      task.status = "done";
      savePlan(plan);
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const child = spawn("sh", ["-c", task.check_cmd as string], {
        stdio: "inherit",
        shell: false,
      });

      const timeout = setTimeout(() => {
        child.kill("SIGTERM");
      }, timeoutMs);

      child.on("exit", (code) => {
        clearTimeout(timeout);
        const success = code === 0;
        task.status = success ? "done" : "failed";
        savePlan(plan);
        resolve(success);
      });
    });
  }

  let failed = 0;

  async function worker(): Promise<void> {
    while (true) {
      const task = readyQueue.shift();
      if (!task) return;
      running.add(task.task_id);
      const ok = await runTask(task);
      if (!ok) {
        failed += 1;

        // attempt repair-spec if patch apply failed
        if (task.check_cmd?.includes("git apply")) {
          const patchPath = extractPatchPath(task.check_cmd);
          if (patchPath && fs.existsSync(patchPath)) {
            try {
              const res = validatePatchFile(path.resolve(patchPath), plan._file ? path.dirname(plan._file) : process.cwd());
              if (!res.ok) {
                appendRepairTask(plan, res.specPath);
              }
            } catch {
              // ignore validator errors
            }
          }
        }
      }
      running.delete(task.task_id);
      enqueueReady();
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);

  return failed;
}

function extractPatchPath(cmd?: string): string | null {
  if (!cmd) return null;
  const m = cmd.match(/git apply\s+([^\s]+)/);
  return m ? m[1] : null;
}

function appendRepairTask(plan: Plan, specPath: string) {
  const id = path.basename(specPath).replace(/\.yaml$/, "");
  plan.tasks.push({
    task_id: `auto-fix-${id}`,
    title: `Auto fix for ${id}`,
    check_cmd: "true",
    status: "todo",
  });
  savePlan(plan);
}
