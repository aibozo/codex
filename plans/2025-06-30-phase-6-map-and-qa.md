# Phase 6 – Continuous High-Level Representation & QA Agent

Status: _blocked on Phase 3 & Phase 5_  
Maintainer: observability-team

-------------------------------------------------------------------

## 1. Goal

Provide an always-up-to-date *map* of the code-base & objective DAG for both
humans and LLMs, and introduce a conversational QA agent that can answer
architecture questions via graph search.

-------------------------------------------------------------------

## 2. Deliverables

1. CLI command `codex map` producing:
   • `docs/map/latest.md` – Markdown summary.
   • `docs/map/latest.svg` – SVG rendering (Graphviz).
2. `map-generator.ts` – amalgamates symbol graph + Objective DAG.
3. `qa-agent` plugin (optional) using same data.

-------------------------------------------------------------------

## 3. Work-Items

### 3.1  Data Extraction

1. Query symbol graph for modules, dependencies, LOC.
2. Query Objectives / Tasks for current plan status.
3. Merge into unified graph (nodes typed `module`, `objective`, `task`).

### 3.2  Map Rendering

1. Export DOT file `docs/map/latest.dot`.
2. Use `graphviz` CLI to produce SVG; fallback to `viz.js` if binary missing.
3. Commit (optionally) on every successful CI run.

### 3.3  QA Agent (Stretch)

1. Worker plugin (Phase 4 framework) responding to `codex ask "..."`.
2. Pipeline: parse NL query → graph pattern match → format answer.
3. If unknown, escalate to LLM with graph context in prompt.

### 3.4  CI & Publishing

1. GitHub action `publish-map.yml` attaches SVG to release artifacts.
2. Slack webhook (#codex-ci) posts link to map diff.

-------------------------------------------------------------------

## 4. Refactor Guidelines

• Map generator must read from existing stores only, no new DB writes.  
• Keep rendering code side-effect-free; artifacts written only to `docs/map/`.

-------------------------------------------------------------------

## 5. Testing

1. Snapshot test: DOT output stable for given mock graph.
2. QA agent unit tests: query “Where is caching layer instantiated?” returns correct answer.

-------------------------------------------------------------------

## 6. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Graph too big for DOT | Collapse low-degree nodes heuristically. |
| QA agent hallucinates | Provide confidence score; fallback to grep link. |

-------------------------------------------------------------------

## 7. Definition of Done

• `codex map` runs in < 3 s on 2k-file repo.  
• SVG renders without manual Graphviz install on macOS & Linux.  
• QA agent answers ≥ 70 % of sample queries correctly.

-------------------------------------------------------------------

End of document.
