# Phase 2 – Planning & Task-Graph Execution Loop

Status: _blocked on Phase 1_  
Maintainer: planning-team

-------------------------------------------------------------------

## 1. Goal

Introduce a deterministic Objective/Task DAG that the agent can execute,
monitor, and update idempotently, enabling repeatable multi-step workflows and
clear progress reporting.

-------------------------------------------------------------------

## 2. Scope & Non-Goals

In-scope: YAML schema consumption, executor, progress overlay, hot-key edits.  
Out-of-scope: auto-merge conflict resolution (Phase 4), self-healing red tests
(Phase 4), UI polish (ink diagrams).

-------------------------------------------------------------------

## 3. Deliverables

1. Executor service `src/utils/task-dag-executor.ts`.
2. CLI command `codex run-plan <path>` (non-interactive mode) for CI.
3. TUI overlay showing objective DAG + completion status.
4. Hook: after each `check_cmd` pass/fail → update YAML `status:` field.

-------------------------------------------------------------------

## 4. Data Model Recap

```
type Objective = {
  objective_id: string;   // slug
  title: string;
  tasks: TaskId[];
};

type Task = {
  task_id: string;
  objective_id: string;
  title: string;
  deps: TaskId[];
  check_cmd: string;   // shellcommand
  status: 'todo' | 'running' | 'done' | 'failed';
};
```

-------------------------------------------------------------------

## 5. Work-Items

### 5.1  Parser & Validator

1. YAML → TS objects; re-use Phase 0 JSON-Schema.
2. Error-path must pin-point line/column for bad schemas.

### 5.2  Executor Core

1. Topologically sort tasks per Objective.
2. Concurrency: n=4 by default (configurable).
3. Each task runs inside Codex sandbox; stdout streamed to TUI pane.
4. On success: mark status=done, commit file edit (through agent apply_patch).
5. On failure: mark status=failed and stop downstream tasks.

### 5.3  Incremental Update

1. YAML file is **single source of truth**. Use AST diff to update only `status` fields to preserve comments.
2. Commit (auto) message `plan: update status` with skip-CI flag.

### 5.4  TUI Progress Overlay

1. New Ink component under `components/plan-progress-overlay.tsx`.
2. Show objective bar (tasks complete / total), highlight running tasks.

### 5.5  Git Hooks & CI

1. Add pre-push hook: if any task `status: failed` abort push.
2. Provide `examples/hello-plan` demonstrating green pipeline.

-------------------------------------------------------------------

## 6. Refactor Guidelines

• Executor must be **stateless** between runs – derive all state from YAML.  
• Separate IO (git, fs, shell) behind adapter layer for testability.

-------------------------------------------------------------------

## 7. Testing

1. Unit tests: graph cycle detection, scheduling order.
2. Integration test: Example plan with 3 tasks (passing, failing, dependent).
3. Snapshot test for overlay rendering.

-------------------------------------------------------------------

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Long-running `check_cmd` stalls UI | Add 30-min default timeout + spinner. |
| YAML merge conflicts | Encourage short-lived branches; provide auto-format script `pnpm run format-plan`. |

-------------------------------------------------------------------

## 9. Definition of Done

• Executor runs sample plan to green in CI.  
• TUI displays progress correctly.  
• Pre-push hook blocks unresolved failures.

-------------------------------------------------------------------

End of document.
