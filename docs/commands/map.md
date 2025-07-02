# codex map

**Usage:**
```
codex map [plan.yaml]
```

**Description:**
Generates an up-to-date map of your repository. Outputs files under `docs/map/`:

- `latest.md`  Markdown summary of modules, objective, and tasks.
- `latest.dot` DOT file describing the unified graph (modules, tasks, dependencies).
- `latest.svg` SVG rendering (requires Graphviz `dot`; skipped if not installed).

**Arguments:**
- `plan.yaml`  Path to a plan file. Defaults to the most recent file in `/plans`.

**Examples:**
```shell
codex map
codex map plans/2025-07-01-add-oauth.yaml
```