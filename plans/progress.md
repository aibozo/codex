# Project Progress Snapshot

_Last updated: 2025-07-01_

This document tracks which items from the master roadmap have been delivered,
what has intentionally been deferred, and what remains to be built.

──────────────────────────────────────────────────────────────────────────────
## Phase 0 – Planning Scaffold ✅
• Deterministic `/plans/YYYY-MM-DD-<slug>.yaml` convention
• `codex plan <name>` CLI (+ TUI hot-key `p`)
• Task-DAG JSON-schema & validator (husky pre-push)
• Symbol-registry stub + unit tests

## Phase 1 – Memory & Focus ✅
• JSONL memory store (triples + vector stub)
• Chat & git-commit ingestion
• `codex context --objective` command
• Focus-window builder (recency-plus-boost)

## Phase 2 – Plan Executor ✅
• YAML DAG executor with concurrency
• TUI progress overlay (hot-key `g`)
• Pre-push hook blocks on `status: failed`

## Phase 3 – Symbol Graph & Smart Patching ✅
• Incremental TS symbol graph (`codex graph refresh` / `graph stats`)
• Patch-validator ➜ repair-spec YAML
• Executor auto-adds `auto-fix-<uuid>` tasks on failed git-apply

## Phase 4 – Agent Orchestration ✅
• Agent spec & schema (`agents/*.yaml`)
• Workers (patch-bot, test-bot, doc-bot) with ping/pong IPC
• Supervisor: ready/busy, cost-budget, executor routing
• Fleet CLI (`codex fleet start|stop`), pidfile, graceful shutdown

### Deferred / Todo inside Phase 4
1. **Stable integration tests**
   – `executor-routing.test.ts` currently `skip()` due to timing variance.
2. **Cost overlay in TUI** – spending per agent not yet visualised.

──────────────────────────────────────────────────────────────────────────────
## Next Up

### Phase 5 – State Recognition & Guardrails
• Repo classifier (`greenfield|feature|bugfix|refactor`)
• Auto-branch creation for refactors
• Guard prompts based on repo state

### Phase 6 – High-Level Map & QA Agent
• `codex map` (Markdown + SVG)
• QA-agent that answers NL queries against the graph

──────────────────────────────────────────────────────────────────────────────

### Backlog / Nice-to-haves
• Upgrade symbol graph to SQLite or LiteGraph backend
• Vector-store swap-in (Chroma) for Phase 1 memory
• Additional language extractors (Python, Rust)
• Self-healing cycle (Phase 4 stretch) – open fix-it objective on red CI
