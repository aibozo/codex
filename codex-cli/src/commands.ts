import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import { createInterface } from 'node:readline/promises';

import { ensureAllowed } from './utils/guardrails.js';
import { buildFocusWindow } from './utils/memory-store.js';
import { loadPlan } from './utils/task-dag.js';
import { executePlan } from './utils/task-dag-executor.js';
import { iterateNodes, refreshGraphTs, graphStats } from './utils/symbol-graph.js';
import { generateGraph, graphToMarkdown, graphToDot } from './utils/map-generator.js';
import { askCommand } from './utils/ask-command.js';
import { answerQuery } from './utils/qa-agent.js';
import { validatePatch } from './utils/patch-validator.js';

// Handle `codex map [plan]`
export async function mapCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'map') return null;
  const planPath = input[1] && !input[1].startsWith('-') ? input[1] : '';
  const finalPlan = planPath || (() => {
    const rp = process.cwd(); const pd = path.join(rp, 'plans');
    if (!fs.existsSync(pd)) return '';
    const f = fs.readdirSync(pd).filter(f=>f.endsWith('.yaml')).sort().reverse()[0];
    return f ? path.join(pd, f) : '';
  })();
  if (!finalPlan) {
    console.error('No plan file specified and none found in /plans');
    return 1;
  }
  const plan = loadPlan(finalPlan);
  const symbols = Array.from(iterateNodes());
  const graph = generateGraph(symbols, plan);
  const docsDir = path.join(process.cwd(), 'docs', 'map');
  fs.mkdirSync(docsDir, { recursive: true });
  const md = graphToMarkdown(graph);
  fs.writeFileSync(path.join(docsDir, 'latest.md'), md, 'utf8');
  fs.writeFileSync(path.join(docsDir, 'latest.dot'), graphToDot(graph), 'utf8');
  try { spawnSync('dot', ['-Tsvg', path.join(docsDir,'latest.dot'),' -o',path.join(docsDir,'latest.svg')]); } catch {}
  return 0;
}
// Handle `codex plan <slug>`
export async function planCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'plan') return null;
  try {
    ensureAllowed('plan');
  } catch (err: any) {
    console.error(err.message);
    return 1;
  }
  let objective = input[1];
  if (!objective || objective.startsWith('-')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    objective = (await rl.question('Enter a short objective name (kebab-case, e.g. add-oauth-login): ')).trim();
    rl.close();
  }
  if (!objective) {
    console.error('Aborted: objective name is required.');
    return 1;
  }
  if (!/^[a-z0-9\-]+$/.test(objective)) {
    console.error('Error: objective name must be lowercase alphanumerics and hyphens only.');
    return 1;
  }
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const datePrefix = `${yyyy}-${mm}-${dd}`;
  const repoRoot = process.cwd();
  const plansDir = path.join(repoRoot, 'plans');
  fs.mkdirSync(plansDir, { recursive: true });
  const planPath = path.join(plansDir, `${datePrefix}-${objective}.yaml`);
  if (!fs.existsSync(planPath)) {
    const stub = `# Auto-generated plan stub\nobjective_id: ${objective}\ntitle: ${objective.replace(/-/g, ' ')}\ntasks: []\n`;
    fs.writeFileSync(planPath, stub, 'utf8');
    console.log(`Created new plan at: ${planPath}`);
  } else {
    console.log(`Plan already exists: ${planPath}`);
  }
  const editor = process.env.EDITOR;
  if (editor) {
    spawnSync(editor, [planPath], { stdio: 'inherit' });
  } else {
    console.log('$EDITOR not set – open the file manually if you wish to edit it.');
  }
  return 0;
}

// Handle `codex context [k]`
export async function contextCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'context') return null;
  let k = 20;
  let objective = '';
  for (let i = 1; i < input.length; i++) {
    const a = input[i];
    if (!a) continue;
    if (a === '--objective' || a === '-o') {
      objective = input[++i] || '';
    } else if (/^\d+$/.test(a)) {
      k = Number(a);
    }
  }
  const snippets = buildFocusWindow(k, objective);
  if (snippets.length === 0) {
    console.log('(context window is empty)');
    return 0;
  }
  for (const sn of snippets) {
    console.log(`- [${sn.score.toFixed(0)}] ${sn.snippet}`);
  }
  return 0;
}

// Handle `codex run-plan [options] [plan]`
export async function runPlanCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'run-plan') return null;
  try {
    ensureAllowed('run-plan');
  } catch (err: any) {
    console.error(err.message);
    return 1;
  }
  let planPath = input[1] && !input[1].startsWith('-') ? input[1] : '';
  let concurrency = 4;
  let timeoutSec = 1800;
  for (let i = 1; i < input.length; i++) {
    const a = input[i];
    if (a === '--concurrency' || a === '-c') {
      concurrency = Number(input[++i] || '4');
    } else if (a === '--timeout' || a === '-t') {
      timeoutSec = Number(input[++i] || '1800');
    } else if (!planPath && !a.startsWith('-')) {
      planPath = a;
    }
  }
  if (!planPath) {
    const rp = process.cwd();
    const pd = path.join(rp, 'plans');
    if (!fs.existsSync(pd)) {
      console.error('No plan file specified and none found in /plans');
      return 1;
    }
    const f = fs.readdirSync(pd).filter((f) => f.endsWith('.yaml')).sort().reverse()[0];
    planPath = f ? path.join(pd, f) : '';
  }
  if (!planPath) {
    console.error('No plan file specified and none found in /plans');
    return 1;
  }
  const failed = await executePlan(planPath, {
    concurrency,
    timeoutMs: timeoutSec * 1000,
  });
  return failed === 0 ? 0 : 1;
}

// Handle `codex graph [refresh|stats]`
export async function graphCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'graph') return null;
  const sub = input[1];
  if (sub === 'refresh') {
    const t0 = Date.now();
    const count = refreshGraphTs();
    console.log(`Indexed ${count} symbols in ${Date.now() - t0} ms`);
    return 0;
  }
  if (sub === 'stats') {
    console.log(graphStats());
    return 0;
  }
  const t0 = Date.now();
  const count = refreshGraphTs();
  console.log(`Indexed ${count} symbols in ${Date.now() - t0} ms`);
  return 0;
}

// Handle `codex validate-patch <file>`
export async function validatePatchCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'validate-patch') return null;
  const file = input[1];
  if (!file || !fs.existsSync(file)) {
    console.error('Usage: codex validate-patch <patch-file>');
    return 1;
  }
  const patchText = fs.readFileSync(file, 'utf8');
  const res = validatePatch(patchText, process.cwd());
  if (res.ok) {
    console.log('Patch applies cleanly ✅');
    return 0;
  }
  console.log('Patch failed – repair spec at', res.specPath);
  return 1;
}

// Handle `codex fleet <start|stop> [plan.yaml]`
export async function fleetCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'fleet') return null;
  const sub = input[1];
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..');
  const pidFile = path.join(projectRoot, 'codex-data', 'fleet.pid');
  if (sub === 'stop') {
    if (!fs.existsSync(pidFile)) {
      console.log('No fleet running');
      return 0;
    }
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    try {
      process.kill(pid, 'SIGTERM');
      fs.rmSync(pidFile);
      console.log('Fleet stopped (pid', pid, ')');
    } catch (err: any) {
      console.error('Failed to stop fleet:', err);
    }
    return 0;
  }
  if (sub === 'start') {
    try {
      ensureAllowed('fleet-start');
    } catch (err: any) {
      console.error(err.message);
      return 1;
    }
    let planPath = input[2] || '';
    if (!planPath) {
      const pd = path.join(projectRoot, 'plans');
      if (!fs.existsSync(pd)) {
        console.error('No plan file specified and none found in /plans');
        return 1;
      }
      const f = fs.readdirSync(pd).filter((f) => f.endsWith('.yaml')).sort().reverse()[0];
      planPath = f ? path.join(pd, f) : '';
    }
    if (!planPath) {
      console.error('No plan file specified and none found in /plans');
      return 1;
    }
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    const runner = path.join(projectRoot, 'scripts', 'run-supervisor.js');
    const child = spawn('node', [runner, planPath], { detached: true, stdio: 'ignore' });
    child.unref();
    fs.writeFileSync(pidFile, String(child.pid), 'utf8');
    console.log('Fleet started (pid', child.pid, ') running plan', planPath);
    return 0;
  }
  console.log('Usage: codex fleet <start|stop> [plan.yaml]');
  return 1;
}

// Handle `codex ask ...`
export async function cliAskCommand(input: string[], flags: any): Promise<number | null> {
  if (input[0] !== 'ask') return null;
  // Parse flags and arguments, handle --no-fallback
  const args = [...input];
  let noFallback = false;
  const noFlagIdx = args.indexOf('--no-fallback');
  if (noFlagIdx !== -1) {
    noFallback = true;
    args.splice(noFlagIdx, 1);
  }
  if (process.env.CODEX_NO_LLM) noFallback = true;
  const query = args.slice(1).join(' ');
  if (!query) {
    console.error('Usage: codex ask [--no-fallback] "your question"');
    return 1;
  }
  const planPath = args[1] && !args[1].startsWith('-') && args[1].endsWith('.yaml') ? args[1] : '';
  try {
    const resp = await askCommand(query, { noFallback, model: process.env.CODEX_LLM_MODEL || 'gpt-4.1-mini', planPath });
    console.log(resp);
    return 0;
  } catch (err: any) {
    console.error('LLM query failed:', err.message);
    return 1;
  }
}