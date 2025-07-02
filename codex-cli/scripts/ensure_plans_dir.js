// Ensure that the top-level `/plans` directory exists. This helper is called
// from the `bootstrap` npm script so that CI and fresh clones have a stable
// folder available for planning artifacts before any commands are executed.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..", "..");
const plansDir = path.join(repoRoot, "plans");

try {
  fs.mkdirSync(plansDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log(`[bootstrap] ensured plans directory: ${plansDir}`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(`[bootstrap] failed to create plans directory:`, err);
  process.exit(1);
}
