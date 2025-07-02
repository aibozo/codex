import { describe, it, expect } from 'vitest';
import { generateGraph } from '../src/utils/map-generator.js';
import { answerQuery } from '../src/utils/qa-agent.js';

describe('qa-agent', () => {
  const symbolNodes = [];
  const plan = {
    objective_id: 'o1',
    title: 'Title',
    tasks: [
      { task_id: 't1', title: 'Task1' },
      { task_id: 't2', title: 'Task2' },
    ],
  };
  // start with default empty modules
  const graph = generateGraph(symbolNodes, plan);
  // override modules for testing
  graph.modules = [ { id: 'mod1.ts', loc: 10 }, { id: 'mod2.ts', loc: 20 } ];

  it('answers modules query', () => {
    const res = answerQuery(graph, 'List modules');
    expect(res).toMatchInlineSnapshot(`
"mod1.ts (10 LOC)\nmod2.ts (20 LOC)"`);
  });

  it('answers tasks query', () => {
    const res = answerQuery(graph, 'What are the tasks?');
    expect(res).toMatchInlineSnapshot(`
"t1: Task1\nt2: Task2"`);
  });

  it('answers objective query', () => {
    const res = answerQuery(graph, 'Show objective');
    expect(res).toMatchInlineSnapshot(`"o1: Title"`);
  });

  it('answers where is <symbol> implemented', () => {
    // stub symbol nodes
    graph.symbols = [ { file: 'foo.ts', symbol: 'MyFunc', kind: 'function', line: 5 } ];
    const loc = answerQuery(graph, 'Where is MyFunc?');
    expect(loc).toMatchInlineSnapshot(`
"MyFunc is in foo.ts:5"`);
  });
  it('fallback for unknown query', () => {
    const res = answerQuery(graph, 'Tell me foo');
    expect(res).toMatchInlineSnapshot(`"I'm sorry, I don't know how to answer that."`);
  });
});