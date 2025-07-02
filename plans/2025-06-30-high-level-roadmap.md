# Codex CLI – High-Level Roadmap (v0.1)

This document translates the seven capability layers from the idea-dump into an
incremental delivery plan.  Each phase produces a **shippable, reviewable
artifact** while unblocking later work.  Dates are intentionally absent – we will
time-box the phases after effort sizing – but *dependencies* and *critical path*
are called out so we can parallelise safely.

-------------------------------------------------------------------

Legend

• 🟢 **Quick-win** – ≤ 1 week, low risk, minimal cross-cuts
• 🟡 **Core milestone** – 1–3 weeks, moderate complexity
• 🔵 **Stretch / opt-in** – parked until capacity or external driver

-------------------------------------------------------------------

## Phase 0 – Repo Hygiene & Planning Scaffold

1. 🟢 *Deterministic planning folder* (this folder!)  
   • Install `/plans/YYYY-MM-DD-<slug>.{md,yaml}` convention.  
   • Command `codex plan …` writes here automatically.

2. 🟢 *Task-DAG YAML schema v0*  
   • Define `objective_id`, `task_id`, `deps`, `check_cmd`.  
   • JSON-Schema in `docs/` so both humans and codegen can validate.

3. 🟢 *Symbol registry stub*  
   • CLI wrapper for `ripgrep --json` → in-mem L2 cache.  
   • Expose `lookup()` / `complete()` API; no write-back yet.

Deliverable: Codex CLI can open a planning session that generates a YAML DAG,
and the symbol registry answers look-ups for current workspace symbols.

-------------------------------------------------------------------

## Phase 1 – Memory & Context Management

1. 🟡 *Hybrid SQLite + vector-store*  
   • Triples table (`subject`, `predicate`, `object`, `ts`).  
   • Chroma (local) for embeddings.  
   • Import/usage relationships auto-ingested from the symbol registry.

2. 🟡 *Focus-window builder v0*  
   • Pagerank × recency × heuristic relevance.  
   • Exposed via `codex context --objective <id>`.

Dependencies: Symbol registry (Phase 0).

Stretch: Pluggable back-ends & supervised distillation (🔵)

-------------------------------------------------------------------

## Phase 2 – Planning & Task-Graph Loop

1. 🟡 *Plan mode CLI* (`codex plan <slug>`)  
   • Hot-key inside TUI toggles writing new plan file.  
   • Re-running generates diff instead of overwrite.

2. 🟡 *Objective DAG executor v0*  
   • Reads YAML, spawns tasks, watches `check_cmd`.  
   • Marks edges complete in the YAML (idempotent).

3. 🟢 *Progress reporting overlay*  
   • Simple percentage bar in the terminal header.

Dependencies: YAML schema (Phase 0).

Stretch: Editable DAG with user patches & auto-merge conflict handling (🔵)

-------------------------------------------------------------------

## Phase 3 – Code-Graph & Smart-Patching

1. 🟡 *Incremental symbol graph builder*  
   • Wire existing language servers (ts-server, pyright, rust-analyzer).  
   • Persist graph to `/codex-data/symbol-graph.sqlite`.

2. 🟡 *Patch pre-flight validator*  
   • `git apply --check`. On failure: intersect hunk ↔ symbol graph.  
   • Emit typed repair spec and enqueue back onto task queue.

Dependencies: Symbol registry, Task-graph loop.

-------------------------------------------------------------------

## Phase 4 – Agent Orchestration

1. 🟡 *Pluggable agent spec*  
   • YAML `agents/*.yaml` declares role, model, cost budget.  
   • Main CLI process spins workers w/ limited syscall set.

2. 🟡 *Fleet-mode dispatcher*  
   • Round-robin code clusters → patch-bots.  
   • Test-writer and doc-bot as separate workers.

3. 🔵 *Self-healing commit cycle*  
   • Detect red tests post-commit, open “fix-it” objective.

Dependencies: Phase 2 executor; Phase 3 repair spec for retries.

-------------------------------------------------------------------

## Phase 5 – State Recognition & Workflow Guardrails

1. 🟡 *Repo classifier*  
   • Heuristic + embedding; classify `greenfield|bugfix|refactor|feature`.  
   • Result stored in `/codex-data/repo-state.json`.

2. 🟡 *Workspace guardrails*  
   • On `refactor`, auto-branch + prompt instructions.  
   • Soft-fail if user tries disallowed prompts in current mode.

Dependencies: Symbol graph & memory store (for features signal).

-------------------------------------------------------------------

## Phase 6 – Continuous High-Level Representation & QA

1. 🟡 *`codex map` command*  
   • Generate Markdown + optional SVG via Graphviz.  
   • Combines module map (symbol graph) + Objective DAG status.

2. 🔵 *QA-agent*  
   • Natural-language queries answered via graph search.

Dependencies: Symbol graph, Objective DAG, Memory store.

-------------------------------------------------------------------

## Cross-Cutting Concerns

• **Pure modules & data dir** – every phase writes only under `/codex-data/<module>/…`.
• **Dog-food the API** – internal agents consume the same YAML/CLI endpoints.
• **Fail-soft** – stale symbol graph raises warning + enqueues refresh, never aborts patch.
• **Cheap before smart** – favour static heuristics; plug-in smarter models later.

-------------------------------------------------------------------

## Milestone Summary

| Phase | Key Output | Unblocks |
|-------|------------|----------|
| 0 | Planning folder, YAML schema, symbol registry stub | Everything |
| 1 | Memory store + focus window | Larger prompts, repo classifier |
| 2 | Plan mode & DAG executor | Agent fleet, guardrails |
| 3 | Symbol graph & smart-patching | Reliable patch cycle, self-healing |
| 4 | Multi-agent dispatcher | Scalability, cost control |
| 5 | Repo state + guardrails | Safe refactors |
| 6 | `codex map` & QA agent | Observability, UX polish |

-------------------------------------------------------------------

End of document.
