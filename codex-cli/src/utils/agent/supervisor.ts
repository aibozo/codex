import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import yaml from "js-yaml";

import { sendJson, onJson } from "../ipc.js";
import { loadPlan, savePlan, Task } from "../task-dag.js";

export interface WorkerInfo {
  name: string;
  process: ReturnType<typeof spawn>;
  ready: boolean;
  busy: boolean;
  spend: number;
  budget: number;
}

export class Supervisor {
  private workers: WorkerInfo[] = [];

  constructor(private repoRoot: string, private planPath: string) {
    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  start(): number {
    const specDir = path.join(this.repoRoot, "agents");
    if (!fs.existsSync(specDir)) return 0;

    const specs = fs
      .readdirSync(specDir)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => path.join(specDir, f));

    for (const file of specs) {
      const spec = yaml.load(fs.readFileSync(file, "utf8"));
      if (!spec || spec.enabled === false) continue;
      const workerPath = path.join(
        this.repoRoot,
        "codex-cli",
        "scripts",
        "agent-worker.js",
      );
      const child = spawn("node", [workerPath], {
        stdio: ["ignore", "pipe", "inherit"],
        env: { ...process.env, WORKER_NAME: spec.name },
      });

      const info: WorkerInfo = {
        name: spec.name,
        process: child,
        ready: false,
        busy: false,
        spend: 0,
        budget: spec.cost_budget_usd ?? Infinity,
      };
      this.workers.push(info);

      onJson(child.stdout, (msg) => {
        if (msg.type === "ready" || msg.type === "pong") info.ready = true;
        if (msg.type === "taskDone") {
          info.busy = false;
          if (msg.usage && msg.usage.cost) {
            info.spend += msg.usage.cost;
            if (info.spend > info.budget) {
              sendJson(child.stdin, { type: "shutdown" });
              child.kill("SIGTERM");
              info.ready = false;
            }
          }
          this.markTaskStatus(msg.taskId, msg.status);
        }
      });

      // ping after small delay
      setTimeout(() => sendJson(child.stdin, { type: "ping" }), 100);
    }

    this.timer = setInterval(() => this.dispatchTasks(), 1500);

    return this.workers.length;
  }

  private dispatchTasks(): void {
    const plan = loadPlan(this.planPath);
    for (const task of plan.tasks) {
      if (task.status !== "todo" && task.status !== undefined) continue;

      const freeWorker = this.workers.find(
        (w) =>
          w.ready &&
          !w.busy &&
          (task.executor ? task.executor === w.name : true),
      );
      if (!freeWorker) return;

      freeWorker.busy = true;
      sendJson(freeWorker.process.stdin, {
        type: "runTask",
        taskId: task.task_id,
        planPath: this.planPath,
        check_cmd: task.check_cmd,
      });
      task.status = "running";
      savePlan(plan);
    }
  }

  private markTaskStatus(taskId: string, status: string) {
    const plan = loadPlan(this.planPath);
    const t = plan.tasks.find((ts) => ts.task_id === taskId);
    if (t) {
      t.status = status === "done" ? "done" : "failed";
      savePlan(plan);
    }
  }

  private timer?: NodeJS.Timeout;

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.workers.forEach((w) => w.process.kill());
    // remove pidfile if exists
    try {
      const pidFile = path.join(this.repoRoot, "codex-data", "fleet.pid");
      if (fs.existsSync(pidFile)) fs.rmSync(pidFile);
    } catch {}
  }
}
