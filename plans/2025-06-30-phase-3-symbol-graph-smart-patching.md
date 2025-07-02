# Phase 3 – Incremental Symbol Graph & Smart-Patching

Status: _blocked on Phase 2 executor_  
Maintainer: tooling-team

-------------------------------------------------------------------

## 1. Goal

Provide real-time source-code insight to the patch generator and implement a
robust pre-flight validator that converts `git apply` failures into actionable
repair specs instead of opaque errors.

-------------------------------------------------------------------

## 2. High-Level Flow

```
file-save ▶ language-server ▶ symbol-graph.sqlite ─┐
                                                 │ (change notification)
 Codex agent ──(generate patch)──▶ validator ──▶ git apply --check
                                                 │
                                 success         │  failure
                                 │               ▼
                                 └──▶ patch applied         repair-spec.yaml + enqueue task
```

-------------------------------------------------------------------

## 3. Deliverables

1. `/codex-data/symbol-graph.sqlite` – normalised relational graph.
2. Symbol graph daemon `scripts/symbol-graphd.ts` (node) or Rust micro-service.
3. Pre-flight validator `src/utils/patch-validator.ts`.
4. Typed **Repair Spec** schema `docs/repair-spec.schema.json`.

-------------------------------------------------------------------

## 4. Work-Items

### 4.1  Graph Builder

| # | Task | Details |
|---|------|---------|
| S3-1 | Investigate LSP protocol per language | Use `--stdio` mode. |
| S3-2 | Implement **TS/JS** extractor via `typescript` compiler API. |
| S3-3 | Implement **Rust** extractor via `rust-analyzer` JSON-out. |
| S3-4 | Store edges: `defines`, `references`, `imports` (+ ranges). |
| S3-5 | Emit SQLite WAL every 5 s to avoid I/O stalls. |

### 4.2  Patch Pre-flight Validator

1. Call `git apply --check <patch>`.
2. On failure:
   • Parse stderr to get file paths and line numbers.
   • Query symbol graph for entities touched in failed hunk.
   • Generate `repair-spec.yaml`: {missing_symbol, expected_import, type_mismatch…}.
3. Push new task to Task DAG (Phase 2) with `title: Fix <issue>`.

### 4.3  Agent Integration

• Patch generator receives repair spec via context injection on retry.  
• Limit retry count to 2 to avoid infinite loops.

### 4.4  Performance & Cache

• Graph builder must stay ≤ 100 MB RSS.  
• Provide `codex graph prune` command to clear outdated nodes.

-------------------------------------------------------------------

## 5. Refactor Guidelines

• Decouple graph builder: run as background child-process; communicate via
  IPC (`std in/out` with JSON messages) to keep CLI responsive.  
• All validator logic surfaces *typed* errors only; UI converts to human text.

-------------------------------------------------------------------

## 6. Testing

1. Unit tests for validator parsing across known git error messages.
2. Integration: synthetic repo w/ deliberate conflict → ensure repair-spec generated.
3. Load test: 5 000 file project, graph build < 60 s.

-------------------------------------------------------------------

## 7. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| LSP API churn | Abstract behind thin façade, version-check on startup. |
| Validator false positives | Add manual fallback path: if spec empty, surface raw stderr. |

-------------------------------------------------------------------

## 8. Definition of Done

• Symbol graph continuously updating on file saves.  
• Patch validator intercepts >90 % of `git apply` failures in integration test.  
• Repair spec tasks appear in plan YAML and resolve after fix.

-------------------------------------------------------------------

End of document.
