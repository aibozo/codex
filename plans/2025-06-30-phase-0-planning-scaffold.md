# Phase 0 – Repo Hygiene & Planning Scaffold

Status: _not started_  
Maintainer: core-team

-------------------------------------------------------------------

## 1. Goal

Establish a deterministic, file-based planning workflow and seed two critical
in-memory utilities (Task-DAG schema & Symbol Registry stub).  These
foundations will be consumed by every later phase, so code boundaries and
naming conventions must be rock-solid.

-------------------------------------------------------------------

## 2. Deliverables

1. `/plans` directory (landed)
2. JSON-Schema definition for Task-DAG YAML   `docs/task_dag.schema.json`
3. Planning CLI enhancements:
   • `codex plan <slug>`
   • Hot-key inside TUI → generates/opens plan file.
4. In-memory Symbol Registry stub (`packages/codex-cli/src/symbol-registry.ts`).

-------------------------------------------------------------------

## 3. Work-items

### 3.1  Planning Folder Integration

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| P0-1 | Update build scripts to **create `/plans` if missing** during `npm run bootstrap` | `codex-cli/scripts` | Avoid CI failures on fresh clones. |
| P0-2 | Extend `codex plan` command to **resolve deterministic path**: `plans/YYYY-MM-DD-<slug>.yaml` | `codex-cli/src/cli.tsx` | Use day in UTC. |
| P0-3 | **Hot-key** (default: `p`) in TUI triggers the same command | `components/chat/terminal-header.tsx` | Must debounce so key doesn’t leak to shell. |

### 3.2  Task-DAG YAML Schema

1. Draft JSON-Schema in `docs/task_dag.schema.json`.
2. Minimal fields: `objective_id`, `task_id`, `title`, `deps`, `check_cmd`, `status`.
3. Add `pnpm run validate-plan` script → uses `ajv-cli`.
4. CI job (`.github/workflows/plans.yml`) validates every changed `plans/**/*.yaml`.

### 3.3  Symbol Registry Stub

1. New util module `symbol-registry.ts` (exported inside `utils`).
2. Internal API:
   • `lookup(fqn: string): Location | undefined`
   • `complete(prefix: string): string[]`
3. Backed by `ripgrep --json` (searches workspace on-demand) with simple LRU cache (Map, size 1 000).
4. Unit tests using Vitest.
5. Feature flag env‐var `CODEX_SYMBOL_REGISTRY_DISABLE` for emergency.

-------------------------------------------------------------------

## 4. Refactor Guidelines

• New modules live under `src/utils` and must export a single public surface.  
• Absolutely **no** side-effects at import time.  
• All file system writes under `/codex-data/*` are forbidden in Phase 0.

-------------------------------------------------------------------

## 5. Testing & QA

1. Add Vitest suite `tests/symbol-registry.test.ts` – covers positive & negative lookups, autocomplete size.
2. E2E test: run `codex plan demo` in CI using `expect(fs.existsSync(…)).toBe(true)`.

-------------------------------------------------------------------

## 6. Documentation

• Update `docs/architecture.md` with diagram connecting Plan folder ↔ Task-DAG ↔ CLI.
• Add Symbol Registry README at `docs/symbol-registry.md`.

-------------------------------------------------------------------

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| TUI hot-key conflicts with user commands | Make key configurable via `~/.config/codex/config.yaml`. |
| Symbol-registry slow on monorepos | Cache + debounce CLI lookups; future Phase 3 will move to incremental LS. |

-------------------------------------------------------------------

## 8. Definition of Done

• All deliverables merged to `main`.  
• CI green including new plan validation job.  
• Manual smoke test: `codex plan spike` opens editor, saves file in correct path.

-------------------------------------------------------------------

End of document.
