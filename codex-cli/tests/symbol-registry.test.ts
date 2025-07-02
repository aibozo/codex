import { afterAll, beforeAll, expect, test } from "vitest";
import fs from "fs/promises";
import path from "path";

import { lookup, complete } from "../src/utils/symbol-registry.js";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(process.cwd(), "symreg-test-"));
  const sampleFile = path.join(tmpDir, "sample.ts");
  await fs.writeFile(
    sampleFile,
    `export function myTestFunction() {\n  return 42;\n}\n`,
    "utf8",
  );
});

afterAll(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
});

test("lookup finds symbol in workspace", () => {
  const loc = lookup("myTestFunction", tmpDir);
  expect(loc).toBeDefined();
  if (loc) {
    expect(path.basename(loc.file)).toBe("sample.ts");
    expect(loc.line).toBeGreaterThanOrEqual(1);
  }
});

test("complete returns cached symbols", () => {
  // Ensure symbol is in cache from previous test
  const suggestions = complete("myTest");
  expect(suggestions).toContain("myTestFunction");
});
