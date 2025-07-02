import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

// Path to the CLI wrapper
const CLI = path.resolve(__dirname, '../bin/codex.js');

describe('CLI Integration', () => {
  let tmpDir;
  beforeAll(async () => {
    // Build the CLI into dist/
    // Build the CLI into dist/
    const buildRes = spawnSync('node', ['build.mjs'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
    if (buildRes.status !== 0) {
      throw new Error(`Build failed: ${buildRes.stderr}`);
    }
  });
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-integ-'));
    // Prepare project structure
    fs.mkdirSync(path.join(tmpDir, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'codex-data'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    // Sample module
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'foo.ts'),
      'export function foo() { return 42; }',
      'utf8'
    );
    // Symbol graph
    const symbol = { file: 'src/foo.ts', symbol: 'foo', kind: 'function', line: 1 };
    fs.writeFileSync(
      path.join(tmpDir, 'codex-data', 'symbol-graph.jsonl'),
      JSON.stringify(symbol) + '\n',
      'utf8'
    );
    // Plan yaml
    const planYaml = [
      'objective_id: testObj',
      'title: Test Objective',
      'tasks:',
      '  - task_id: t1',
      '    title: TestTask',
      ''
    ].join('\n');
    fs.writeFileSync(
      path.join(tmpDir, 'plans', '0001-test.yaml'),
      planYaml,
      'utf8'
    );
  });

  it('codex map generates docs/map files', async () => {
    const result = spawnSync('node', [CLI, 'map'], { cwd: tmpDir, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const md = fs.readFileSync(
      path.join(tmpDir, 'docs', 'map', 'latest.md'),
      'utf8'
    );
    expect(md).toContain('src/foo.ts');
    expect(md).toContain('t1: TestTask');
    const dot = fs.readFileSync(
      path.join(tmpDir, 'docs', 'map', 'latest.dot'),
      'utf8'
    );
    expect(dot).toContain('"src/foo.ts"');
    expect(dot).toContain('"t1"');
  }, { timeout: 20000 });

  it('codex ask heuristic works with --no-fallback', async () => {
    const result = spawnSync('node', [CLI, 'ask', '--no-fallback', 'Where is foo?'], { cwd: tmpDir, encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('foo is in src/foo.ts:1');
  }, { timeout: 20000 });

  it('codex ask fallback path triggers LLM attempt and reports error', async () => {
    const result = spawnSync('node', [CLI, 'ask', 'Unknown query'], { cwd: tmpDir, encoding: 'utf8' });
    // Heuristic fails and fallback attempts LLM, should error
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('falling back to LLM');
    expect(result.stderr).toMatch(/LLM query failed:/);
  }, { timeout: 20000 });
});