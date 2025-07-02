import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export type TaskStatus = "todo" | "running" | "done" | "failed";

export interface Task {
  task_id: string;
  objective_id?: string;
  title?: string;
  deps?: string[];
  check_cmd?: string;
  executor?: string;
  status?: TaskStatus;
}

export interface Plan {
  objective_id: string;
  title?: string;
  tasks: Task[];
  _file?: string; // populated after load
}

export function loadPlan(filePath: string): Plan {
  const raw = fs.readFileSync(filePath, "utf8");
  const doc = yaml.load(raw) as Plan;
  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid plan YAML");
  }
  if (!Array.isArray(doc.tasks)) doc.tasks = [];
  doc._file = path.resolve(filePath);
  return doc;
}

export function savePlan(plan: Plan): void {
  if (!plan._file) throw new Error("Plan _file not set");
  const copy: any = { ...plan };
  delete copy._file;
  const yamlText = yaml.dump(copy, { noRefs: true, lineWidth: 120 });
  fs.writeFileSync(plan._file, yamlText, "utf8");
}

// Detect cycles using DFS
export function detectCycle(tasks: Task[]): string | null {
  const map = new Map<string, Task>();
  tasks.forEach((t) => map.set(t.task_id, t));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): boolean {
    if (visited.has(id)) return false;
    if (visiting.has(id)) return true; // cycle
    visiting.add(id);
    const task = map.get(id);
    if (task && task.deps) {
      for (const dep of task.deps) {
        if (dfs(dep)) return true;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  for (const t of tasks) {
    if (dfs(t.task_id)) return t.task_id;
  }
  return null;
}

export function topologicalSort(tasks: Task[]): Task[] {
  const sorted: Task[] = [];
  const visited = new Set<string>();
  const map = new Map(tasks.map((t) => [t.task_id, t] as const));

  function visit(t: Task) {
    if (visited.has(t.task_id)) return;
    if (t.deps) {
      t.deps.forEach((d) => {
        const depTask = map.get(d);
        if (depTask) visit(depTask);
      });
    }
    visited.add(t.task_id);
    sorted.push(t);
  }

  tasks.forEach(visit);
  return sorted;
}
