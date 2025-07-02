#!/usr/bin/env node
// Validate all YAML plan files against a minimal schema using Zod.

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { z } from "zod";

// ---------------- Schema ------------------
const StatusEnum = z.enum(["todo", "running", "done", "failed"]);

const TaskSchema = z.object({
  task_id: z.string(),
  title: z.string().optional(),
  deps: z.array(z.string()).optional(),
  check_cmd: z.string().optional(),
  status: StatusEnum.optional(),
});

const PlanSchema = z.object({
  objective_id: z.string(),
  title: z.string().optional(),
  tasks: z.array(TaskSchema).optional(),
});

// --------------- Helpers -------------------
function collectYamlFiles(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      res.push(...collectYamlFiles(full));
    } else if (/\.ya?ml$/i.test(entry.name)) {
      res.push(full);
    }
  }
  return res;
}

function validateFile(file) {
  const content = fs.readFileSync(file, "utf8");
  let doc;
  try {
    doc = yaml.load(content);
  } catch (err) {
    return [`${file}: YAML parse error – ${(err.message || "").split("\n")[0]}`];
  }

  const parsed = PlanSchema.safeParse(doc);
  if (parsed.success) return [];

  return parsed.error.issues.map((iss) => `${file}: ${iss.path.join(".") || "(root)"} – ${iss.message}`);
}

// --------------- Main ---------------------

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const plansDir = path.join(repoRoot, "plans");

if (!fs.existsSync(plansDir)) {
  console.error(`No /plans directory found at ${plansDir}`);
  process.exit(1);
}

const yamlFiles = collectYamlFiles(plansDir);
let errors = [];
for (const f of yamlFiles) {
  errors = errors.concat(validateFile(f));
}

if (errors.length) {
  console.error("✖ Plan validation failed:\n" + errors.join("\n"));
  process.exit(1);
}

console.log(`✓ ${yamlFiles.length} plan file(s) validated successfully.`);
