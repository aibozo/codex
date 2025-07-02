# Codex CLI Task-Graph Runner

This guide shows how to work with plan YAML files and the Phase-2 task runner.

## 1. Create a plan

```bash
codex plan my-objective  # creates plans/YYYY-MM-DD-my-objective.yaml
```

Populate the file with tasks:

```yaml
objective_id: my-objective
title: Example plan
tasks:
  - task_id: unit-tests
    check_cmd: "npm test"
  - task_id: lint
    deps: [unit-tests]
    check_cmd: "npm run lint"
```

## 2. Run the plan

```bash
# defaults: 4 workers, 30-minute timeout per task
codex run-plan plans/2025-06-30-my-objective.yaml

# custom settings
codex run-plan -c 8 -t 900   # 8 workers, 15-minute timeout

# no file argument ⇒ newest file in /plans
codex run-plan
```

Exit status is non-zero when any task fails, so CI can rely on it.

## 3. Monitor progress in the TUI

* `p` – toggle **Plan-Mode** (create/open plan)
* `g` – open **progress overlay** (live task statuses)

Glyphs: `○` todo, `●` running, `✔` done, `✖` failed.

## 4. Push safety

The Husky *pre-push* hook blocks a push when:

* YAML validation fails, or
* any plan file contains `status: failed`.

Bypass with `git push --no-verify` (discouraged).

## 5. Example plan

Run the bundled example:

```bash
codex run-plan plans/examples/hello-plan.yaml
```

Press `g` to watch tasks complete.
