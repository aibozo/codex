# Phase 5 – State Recognition & Workflow Guardrails

Status: _blocked on Phase 3 & 4_  
Maintainer: workflow-team

-------------------------------------------------------------------

## 1. Goal

Detect the *state* of the repository and enforce appropriate guardrails to
prevent accidental damage (e.g., running a massive refactor on a hotfix
branch).  Provide automatic branch protection and user feedback.

-------------------------------------------------------------------

## 2. Classifier Design

1. **Heuristic features**: git history (files changed count, churn), branch name
   patterns, presence of tests, diff stats.
2. **Embedding features**: embedding of plan YAML objective titles & recent chat
   messages.
3. Output label: `greenfield | feature | bugfix | refactor` + confidence.

-------------------------------------------------------------------

## 3. Deliverables

1. Classifier module `src/utils/repo-state-classifier.ts`.
2. Store `/codex-data/repo-state.json` with label + timestamp.
3. Guardrail middleware in agent loop.
4. Automatic branch creator when entering `refactor` mode.

-------------------------------------------------------------------

## 4. Work-Items

### 4.1  Feature Engineering

| id | Feature | Notes |
|----|---------|-------|
| F1 | `num_files_changed_last_5_commits` | Heuristic |
| F2 | `average_diff_size` | Heuristic |
| F3 | `branch_name_tokens` | Regex match |
| F4 | `objective_embedding` | Use existing model embeddings |

### 4.2  Classifier Implementation

1. Lightweight logistic regression via `ml-log-reg` npm lib (no heavy deps).
2. Training data: bundle small dataset in `data/repo_state_training.csv`.
3. Fallback rule-based if model confidence < 0.5.

### 4.3  Guardrails

1. Before executing Task DAG, check current label.
2. If label=`bugfix`, disallow tasks that modify > 10 files without user `--force`.
3. On label=`refactor`, auto-create branch `refactor/<date>-<slug>` using Git API.
4. Provide CLI flag `--override-state <label>` for emergencies.

### 4.4  User Feedback

1. TUI banner showing current state (color-coded).  
2. If an action is blocked, display rationale + override instructions.

-------------------------------------------------------------------

## 5. Testing

1. Unit tests of classifier across synthetic commits.  
2. Integration test: generate large diff, ensure guardrail triggers branch creation.

-------------------------------------------------------------------

## 6. Documentation

• `docs/workflow-guardrails.md` – algorithms, override options.

-------------------------------------------------------------------

## 7. Risks

| Risk | Mitigation |
|------|------------|
| False positives block user | Always provide `--override-state`, log reason. |
| Classifier overfits small dataset | Keep heuristics primary, treat ML as hint. |

-------------------------------------------------------------------

## 8. Definition of Done

• Classifier confidence > 0.8 macro-F1 on test set.  
• Guardrail triggers in integration tests.  
• Users can override with single flag.

-------------------------------------------------------------------

End of document.
