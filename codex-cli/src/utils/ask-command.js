import { loadPlan } from "./task-dag.js";
import { iterateNodes } from "./symbol-graph.js";
import { generateGraph, graphToMarkdown } from "./map-generator.js";
import { answerQuery } from "./qa-agent.js";
import { createOpenAIClient } from "./openai-client.js";

/**
 * Handle an 'ask' request over the code map, with optional LLM fallback.
 * @param {string} query The question to ask.
 * @param {object} opts
 * @param {boolean} opts.noFallback If true, skip LLM fallback.
 * @param {string} [opts.model] Model name for LLM fallback.
 * @returns {Promise<string>} The answer text.
 */
export async function askCommand(query, opts = {}) {
  const { noFallback = false, model = 'gpt-4.1-mini', planPath: overridePlan } = opts;
  const planPath = overridePlan || findLatestPlan();
  const plan = loadPlan(planPath);
  const symbols = Array.from(iterateNodes());
  const graph = generateGraph(symbols, plan);

  if (!noFallback) {
    const { getApiKey } = await import('./config.js');
    if (!getApiKey()) {
      throw new Error('OpenAI API key not set. Please set OPENAI_API_KEY to enable LLM.');
    }
    const summary = graphToMarkdown(graph).split(/\r?\n/).slice(0, 50).join('\n');
    const openai = createOpenAIClient({ provider: undefined });
    const messages = [
      { role: 'system', content: 'You are a helpful assistant that answers questions about the codebase based on the provided map.' },
      { role: 'assistant', content: summary },
      { role: 'user', content: query },
    ];
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 512,
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch {}
  }

  return answerQuery(graph, query);
}

// Helper to find latest plan file in current working directory
import fs from 'fs';
import path from 'path';
function findLatestPlan() {
  const repoRoot = process.cwd();
  const plansDir = path.join(repoRoot, 'plans');
  if (!fs.existsSync(plansDir)) return '';
  const files = fs.readdirSync(plansDir).filter((f) => f.endsWith('.yaml')).sort().reverse();
  if (files.length === 0) return '';
  return path.join(plansDir, files[0]);
}