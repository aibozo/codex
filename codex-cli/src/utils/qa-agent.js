/**
 * Simple QA agent over the unified code map.
 * @param {{ modules: {id: string, loc: number}[]; objective: {id: string, title?: string}; tasks: {id: string, title?: string}[]; deps: any[]; symbols?: {file: string, symbol: string, kind: string, line: number}[] }} graph
 * @param {string} query
 * @returns {string}
 */
export function answerQuery(graph, query) {
  const q = query.toLowerCase();
  // Heuristic: symbol location lookup e.g. "Where is Foo?"
  const whereMatch = query.match(/where (?:is|can i find) (.+?)(?:\?|$)/i);
  if (whereMatch) {
    const item = whereMatch[1].trim();
    const itemLower = item.toLowerCase();
    const symbols = graph.symbols || [];
    const matches = symbols.filter((n) => n.symbol.toLowerCase() === itemLower || n.symbol.toLowerCase().includes(itemLower));
    if (matches.length) {
      return matches.map((n) => `${n.symbol} is in ${n.file}:${n.line}`).join('\n');
    } else {
      return `No symbol matching "${item}" found.`;
    }
  }
  if (q.includes('modules')) {
    return graph.modules
      .map((m) => `${m.id} (${m.loc} LOC)`)
      .join('\n');
  }
  if (q.includes('tasks')) {
    return graph.tasks
      .map((t) => `${t.id}: ${t.title || ''}`)
      .join('\n');
  }
  if (q.includes('objective')) {
    const o = graph.objective;
    return `${o.id}: ${o.title || ''}`;
  }
  return "I'm sorry, I don't know how to answer that.";
}