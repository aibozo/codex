import { describe, it, expect } from 'vitest';
import { generateGraph, graphToDot, graphToMarkdown } from '../src/utils/map-generator.js';

describe('map-generator', () => {
  it('graphToDot produces stable DOT output', () => {
    const symbolNodes = [
      { file: 'mod1.ts', symbol: 'func', kind: 'function' },
      { file: 'mod2.ts', symbol: 'ClassA', kind: 'class' },
    ];
    const plan = {
      objective_id: 'o1',
      title: 'Obj 1',
      tasks: [
        { task_id: 't1', title: 'Task1' },
        { task_id: 't2', title: 'Task2', deps: ['t1'] },
      ],
    };
    const graph = generateGraph(symbolNodes, plan as any);
    const dot = graphToDot(graph);
    expect(dot).toMatchInlineSnapshot(`
"digraph codexmap {\n  rankdir=LR;\n  \"mod1.ts\" [label=\"mod1.ts\n(0 LOC)\" shape=box];\n  \"mod2.ts\" [label=\"mod2.ts\n(0 LOC)\" shape=box];\n  \"o1\" [label=\"Objective: Obj 1\" shape=oval style=filled fillcolor=lightgray];\n  \"t1\" [label=\"Task: Task1\" shape=ellipse];\n  \"t2\" [label=\"Task: Task2\" shape=ellipse];\n  \"o1\" -> \"t1\";\n  \"o1\" -> \"t2\";\n  \"t1\" -> \"t2\";\n}"`);
  });

  it('graphToMarkdown produces expected markdown', () => {
    const symbolNodes = [
      { file: 'mod1.ts', symbol: 'func', kind: 'function' },
      { file: 'mod2.ts', symbol: 'ClassA', kind: 'class' },
    ];
    const plan = {
      objective_id: 'o1',
      title: 'Obj 1',
      tasks: [
        { task_id: 't1', title: 'Task1' },
        { task_id: 't2', title: 'Task2', deps: ['t1'] },
      ],
    };
    const graph = generateGraph(symbolNodes, plan as any);
    const md = graphToMarkdown(graph);
    expect(md).toMatchInlineSnapshot(`
"# Codebase Map\n\n## Modules\n- mod1.ts (0 LOC)\n- mod2.ts (0 LOC)\n\n## Objective\n- o1: Obj 1\n\n## Tasks\n- t1: Task1\n- t2: Task2\n"`);
  });
});