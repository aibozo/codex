import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prepare stubs for dependencies
const testPlan = { objective_id: 'o1', title: 'TestPlan', tasks: [] };
const testSymbols = [];
const testGraph = { modules: [], objective: { id: 'o1', title: 'TestPlan' }, tasks: [], deps: [], symbols: testSymbols };
const testSummary = '# Summary';

vi.mock('../src/utils/task-dag.js', () => ({ loadPlan: () => testPlan }));
vi.mock('../src/utils/symbol-graph.js', () => ({ iterateNodes: () => testSymbols }));
vi.mock('../src/utils/map-generator.js', () => ({
  generateGraph: () => testGraph,
  graphToMarkdown: () => testSummary,
}));
vi.mock('../src/utils/qa-agent.js', () => ({ answerQuery: vi.fn() }));
const mockOpenAI = { chat: { completions: { create: vi.fn() } } };
vi.mock('../src/utils/openai-client.js', () => ({ createOpenAIClient: () => mockOpenAI }));

import { askCommand } from '../src/utils/ask-command.js';
import { answerQuery } from '../src/utils/qa-agent.js';

describe('askCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns heuristic answer when available', async () => {
    vi.mocked(answerQuery).mockReturnValueOnce('HEURISTIC');
    const res = await askCommand('Any query', { noFallback: false });
    expect(res).toBe('HEURISTIC');
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
  });

  it('respects noFallback flag even when heuristic fails', async () => {
    vi.mocked(answerQuery).mockReturnValueOnce("I'm sorry, ...");
    const res = await askCommand('Unknown query', { noFallback: true });
    expect(res).toBe("I'm sorry, ...");
    expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
  });

  it('falls back to LLM when heuristic fails and noFallback is false', async () => {
    vi.mocked(answerQuery).mockReturnValueOnce("I'm sorry, no match");
    mockOpenAI.chat.completions.create.mockResolvedValueOnce({ choices: [{ message: { content: 'LLM ANSWER' } }] });
    const res = await askCommand('Unknown query', { noFallback: false, model: 'test-model' });
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'test-model',
      messages: expect.any(Array),
      temperature: expect.any(Number),
      max_tokens: expect.any(Number),
    }));
    expect(res).toBe('LLM ANSWER');
  });
});