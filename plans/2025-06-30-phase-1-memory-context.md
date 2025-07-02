# Phase 1 – Memory Layer & Context Management

Status: _blocked on Phase 0_

Maintainer: memory-team

-------------------------------------------------------------------

## 1. Goal

Persist long-horizon knowledge of the workspace and user interaction so the
agent can build *focused* prompts without blowing the context window.  Deliver
an initial automatic “focus window” builder that ranks relevant entities.

-------------------------------------------------------------------

## 2. Architecture Overview

```
┌────────────────┐    ingest   ┌────────────────┐
│ Symbol graph   │───────────▶│ KG Triples     │
│ (Phase 3)      │            │ sqlite         │
└────────────────┘            └────────────────┘
                                 ▲
                                 │embedding
   user chat logs                │
          │                      ▼
          └───────────▶  Vector Store (Chroma)

Focus-window builder queries both stores, ranks items, returns top-K snippets.
```

-------------------------------------------------------------------

## 3. Deliverables

1. `/codex-data/memory/kg.sqlite` – hybrid knowledge graph.
2. `/codex-data/memory/chroma/` – local embedding index.
3. Node module `src/utils/memory-store.ts` – CRUD + query.
4. Command `codex context --objective <id>` – prints distilled context.
5. Integration into agent loop: Context builder runs before every model call.

-------------------------------------------------------------------

## 4. Work-Items

### 4.1  Storage Layer

| # | Task | Details |
|---|------|---------|
| M1-1 | Scaffold **SQLite schema** | Table `triples(subject, predicate, object, ts)`; indexes on `(subject)`, `(object)`, `(ts)`. |
| M1-2 | Create **Chroma client wrapper** | Local (no network), dimension = 1536. |
| M1-3 | Migrate ingestion pipeline | Parse symbol-graph export, insert `imports`, `defines` relations. |

### 4.2  Ingestion Hooks

1. Hook after successful `git commit` → ingest diff summary into KG (file *modifies* function, etc.).
2. Hook chat commands: Record Q/A pairs (session id, ts) to allow future retrieval.

### 4.3  Focus-Window Builder (FWB)

1. Algorithm: Pagerank over KG × exponential decay by `ts` × optional keyword filter (objective slug).
2. Tunable hyper-params in `~/.config/codex/memory.yaml` (k, decay_rate).
3. Output format: Array<{source, snippet, score}> limited to BPE tokens ≤ 2 000.

### 4.4  CLI & Agent Integration

1. CLI command `codex context` (stand-alone) returns Markdown list.
2. Agent wrapper reads FWB output and prepends to prompt.

### 4.5  Telemetry & Metrics

1. Log (#triples, vector count, FWB latency) to `DEBUG` logger.
2. Add `codex stats` command for quick inspection.

-------------------------------------------------------------------

## 5. Refactor & Clean Code Guidelines

• Keep **memory layer pure**: no direct imports from agent code; expose an interface.
• All SQL queries live in `/sql/memory/` files so they can be statically analysed.
• Use dependency injection for DB path to ease testing.

-------------------------------------------------------------------

## 6. Testing & QA

1. Unit tests covering CRUD and FWB ranking stability.
2. Integration test simulating 100 file imports and verifying top-k recall rate ≥ 0.9.
3. Performance guard: FWB must complete ≤ 150 ms on repo ≤ 1 000 files.

-------------------------------------------------------------------

## 7. Documentation

• `docs/memory-layer.md` – ER diagram, ingestion flows, configuration keys.
• Update high-level architecture diagram.

-------------------------------------------------------------------

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Vector store binary size | Large repo bloat | Allow cleaning via `codex memory prune` |
| SQL locking on Windows | Agent freeze | Use WAL mode + retry with backoff |

-------------------------------------------------------------------

## 9. Definition of Done

• Memory tests green, FWB passes performance gate.  
• `codex context` returns reasonable snippets for sample objective.  
• No regression in CLI latency (<+50 ms per call).

-------------------------------------------------------------------

End of document.
