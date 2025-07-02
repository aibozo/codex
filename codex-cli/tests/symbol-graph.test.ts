import { beforeEach, expect, test } from "vitest";
import fs from "fs";
import path from "path";

import {
  clearGraph,
  DATA_DIR,
  extractTsFile,
  refreshGraphTs,
  iterateNodes,
} from "../src/utils/symbol-graph.js";

beforeEach(() => {
  clearGraph();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test("extractTsFile captures defines and imports", () => {
  const src = `import { Foo } from './bar';\nexport function baz() { return Foo; }`;
  const tmp = path.join(process.cwd(), "tmp.ts");
  fs.writeFileSync(tmp, src);
  const nodes = extractTsFile(tmp, src);
  fs.unlinkSync(tmp);

  expect(nodes.some((n) => n.kind === "import" && n.symbol.includes("./bar"))).toBe(true);
  expect(nodes.some((n) => n.kind === "function" && n.symbol === "baz")).toBe(true);
});

test("refreshGraphTs writes JSONL file", () => {
  // create temp ts file so refresh picks up at least one symbol
  const tmpFile = path.join(process.cwd(), "tmp-symbol.ts");
  fs.writeFileSync(tmpFile, "export const foo_bar=1;\n");
  const count = refreshGraphTs();
  fs.unlinkSync(tmpFile);
  expect(count).toBeGreaterThan(0);
  const symbols = Array.from(iterateNodes());
  expect(symbols.length).toBe(count);
});
