import fs from "fs";
import path from "path";

// Use current working directory as project root
const repoRoot = process.cwd();
import { loadPlan } from "../utils/task-dag.js";
import { iterateNodes } from "../utils/symbol-graph.js";

/**
 * Build a unified graph of modules, objectives, and tasks.
 * @param {Iterable} symbolNodes  Iterable of symbol graph nodes with .file
 * @param {import("../utils/task-dag").Plan} plan  Loaded Plan object
 * @returns {{ modules: {id: string, loc: number}[]; objective: {id: string, title?: string}; tasks: {id: string, title?: string}[]; deps: {from: string, to: string}[] }}
 */
export function generateGraph(symbolNodes, plan) {
  // Gather module files and import relationships
  const modulesSet = new Set();
  const importEdges = [];
  for (const node of symbolNodes) {
    if (node.file) modulesSet.add(node.file);
    // collect relative import edges
    if (node.kind === "import" && node.symbol.startsWith(".")) {
      const originAbs = path.resolve(repoRoot, node.file);
      const originDir = path.dirname(originAbs);
      const spec = node.symbol;
      let targetAbs = null;
      for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
        let cand = path.resolve(originDir, spec + ext);
        if (fs.existsSync(cand)) { targetAbs = cand; break; }
        cand = path.resolve(originDir, spec, "index" + ext);
        if (fs.existsSync(cand)) { targetAbs = cand; break; }
      }
      if (targetAbs) {
        const targetRel = path.relative(repoRoot, targetAbs).replace(/\\/g, "/");
        modulesSet.add(targetRel);
        importEdges.push({ from: node.file, to: targetRel });
      }
    }
  }
  // Prepare module list with LOC
  const moduleFiles = Array.from(modulesSet).sort();
  const modules = moduleFiles.map((file) => {
    const abs = path.resolve(repoRoot, file);
    let loc = 0;
    if (fs.existsSync(abs)) {
      loc = fs.readFileSync(abs, "utf8").split(/\r?\n/).length;
    }
    return { id: file, loc };
  });

  const objective = { id: plan.objective_id, title: plan.title };
  const tasks = (plan.tasks || []).map((t) => ({ id: t.task_id, title: t.title }));
  // Build all edges: imports, objective->tasks, task dependencies
  const deps = [];
  // import edges (module -> module)
  importEdges.forEach((e) => deps.push({ from: e.from, to: e.to }));
  // objective -> task
  for (const t of tasks) {
    deps.push({ from: objective.id, to: t.id });
  }
  // task dependencies
  for (const t of plan.tasks || []) {
    if (t.deps) {
      for (const dep of t.deps) {
        deps.push({ from: dep, to: t.task_id });
      }
    }
  }
  // Retain original symbol nodes for QA lookup
  const symbolsArr = Array.isArray(symbolNodes) ? symbolNodes : Array.from(symbolNodes);
  return { modules, objective, tasks, deps, symbols: symbolsArr };
}

/**
 * Serialize graph to Markdown.
 */
export function graphToMarkdown(graph) {
  let md = "# Codebase Map\n\n";
  md += "## Modules\n";
  for (const m of graph.modules) {
    md += `- ${m.id} (${m.loc} LOC)\n`;
  }
  md += "\n## Objective\n";
  md += `- ${graph.objective.id}: ${graph.objective.title || ""}\n`;
  md += "\n## Tasks\n";
  for (const t of graph.tasks) {
    md += `- ${t.id}: ${t.title || ""}\n`;
  }
  return md;
}

/**
 * Serialize graph to DOT format for Graphviz.
 */
export function graphToDot(graph) {
  const lines = [];
  lines.push("digraph codexmap {", "  rankdir=LR;");
  // modules as boxes with LOC
  for (const m of graph.modules) {
    const id = m.id.replace(/"/g, '\\"');
    const label = `${id}\n(${m.loc} LOC)`;
    lines.push(`  "${id}" [label="${label}" shape=box];`);
  }
  // objective node
  {
    const id = graph.objective.id;
    const label = (graph.objective.title || id).replace(/"/g, '\\"');
    lines.push(`  "${id}" [label="Objective: ${label}" shape=oval style=filled fillcolor=lightgray];`);
  }
  // task nodes
  for (const t of graph.tasks) {
    const id = t.id;
    const label = (t.title || id).replace(/"/g, '\\"');
    lines.push(`  "${id}" [label="Task: ${label}" shape=ellipse];`);
  }
  // edges
  for (const e of graph.deps) {
    lines.push(`  "${e.from}" -> "${e.to}";`);
  }
  lines.push("}");
  return lines.join("\n");
}