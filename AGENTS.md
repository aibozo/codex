# Rust/codex-rs

In the codex-rs folder where the rust code lives:

- Never add or modify any code related to `CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR`. You operate in a sandbox where `CODEX_SANDBOX_NETWORK_DISABLED=1` will be set whenever you use the `shell` tool. Any existing code that uses `CODEX_SANDBOX_NETWORK_DISABLED_ENV_VAR` was authored with this fact in mind. It is often used to early exit out of tests that the author knew you would not be able to run given your sandbox limitations.

# Roadmap Summary

This repository tracks a multi-phase roadmap. Phases 0–4 are already implemented, while Phases 5–6 remain.

## Implemented Phases

1. **Phase 0 – Planning Scaffold**: `/plans` directory, `codex plan` command, JSON-schema for task DAGs, and a symbol-registry stub.
2. **Phase 1 – Memory & Context**: JSONL memory store and `codex context` command.
3. **Phase 2 – Plan Executor**: YAML DAG executor via `codex run-plan` and a TUI progress overlay.
4. **Phase 3 – Symbol Graph & Smart Patching**: Incremental symbol graph and patch validator with repair-task support.
5. **Phase 4 – Agent Orchestration**: Fleet supervisor and worker framework, `codex fleet start|stop`.

## Upcoming Work

- **Phase 5 – State Recognition & Guardrails**: Repository classifier storing `/codex-data/repo-state.json` and workflow guard prompts.
- **Phase 6 – Map & QA Agent**: `codex map` command and QA agent that answers questions from the generated map.

Refer to `plans/progress.md` for the current status of each phase when contributing to this secondary fork.
