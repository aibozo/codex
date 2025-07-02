# Phase 4 – Agent Orchestration (Fleet of Specialists)

Status: _blocked on Phase 2 & 3_  
Maintainer: orchestration-team

-------------------------------------------------------------------

## 1. Goal

Scale productivity and cost-efficiency by spawning a fleet of lightweight
specialist agents under the supervision of the main (expensive) CLI agent.  The
framework must allow users to plug in custom bots with controlled permissions.

-------------------------------------------------------------------

## 2. Architecture Diagram

```
                                    ┌────────────────┐
                                    │  Main CLI      │
                                    │  (o3 model)    │
                                    └─────┬──────────┘
                           YAML spec │    │ IPC (JSON)
                                      │    │
┌──────────┐  spawn   ┌──────────────┴──────┴─────────────┐
│ patch-bot │◀────────┤  Agent Supervisor (Node child-proc)│
│ test-bot  │         └────────┬──────────────────┬───────┘
│ doc-bot   │                  │                  │
│ …         │      stdout      │      stdout      │
└──────────┘                   ▼                  ▼
            sandboxed worker process per agent (cheap model)
```

-------------------------------------------------------------------

## 3. Deliverables

1. YAML Agent Spec: `agents/<name>.yaml`
2. Supervisor: `src/utils/agent/supervisor.ts` – process pool manager.
3. IPC protocol (`JSON-RPC 2.0` over stdio).
4. Sample agents: `patch-bot`, `test-writer-bot`, `doc-bot`.
5. Cost tracker overlay in TUI.

-------------------------------------------------------------------

## 4. Work-Items

### 4.1  YAML Spec & Parser

Fields: `name`, `role`, `model`, `max_tokens`, `cost_budget`, `allowed_syscalls`.
CI validation using JSON-Schema `docs/agent-spec.schema.json`.

### 4.2  Supervisor Implementation

1. Read all `agents/*.yaml` on startup.
2. Spawn worker process with restricted env + seccomp/landlock (reuse existing sandbox code).
3. Provide message bus: `call`, `stream`, `kill`.

### 4.3  Worker Template

1. Shared runner script `scripts/agent-worker.ts` that loads role plugin.
2. Plugin interface: `{init(ctx), onTask(task), shutdown()}`.

### 4.4  Cost Tracking & Throttling

1. Intercept OpenAI usage from each worker; accumulate `$` cost.
2. If agent exceeds `cost_budget`, supervisor pauses it and notifies user.

### 4.5  Demo Agents

• `patch-bot`: consumes repair-spec tasks and retries patches.  
• `test-writer-bot`: generates failing unit test scaffolds for new code.  
• `doc-bot`: adds doc-comments to changed files.

### 4.6  Security Hardening

1. Strict syscall whitelist (re-use `sandbox/landlock`).
2. Ensure workers cannot spawn grand-children.

-------------------------------------------------------------------

## 5. Refactor Guidelines

• Supervisor must be language-agnostic; workers can be Node or Rust.  
• IPC messages must be schema-validated at boundary.

-------------------------------------------------------------------

## 6. Testing

1. Unit: supervisor spawn/kill, cost-throttle.  
2. Integration: run patch-bot on failing plan, assert fix committed.

-------------------------------------------------------------------

## 7. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Race conditions on file writes | Use File-lock util + commit queue. |
| LLM bill shock | Hard cap + default low budgets; cost overlay visible. |

-------------------------------------------------------------------

## 8. Definition of Done

• User can run `codex fleet start`; sample agents execute tasks.  
• Cost overlay shows cumulative spend.  
• All agents respect syscall whitelist by tests.

-------------------------------------------------------------------

End of document.
