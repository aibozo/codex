# codex ask

**Usage:**
```
codex ask [--no-fallback] "your question"
```

**Description:**
Answers natural-language questions about your repository's code map.

1. Sends your question with a brief map summary to an LLM (default `gpt-4.1-mini`).
2. If the LLM is disabled or fails, falls back to a fast local heuristic lookup (symbols, modules, tasks).

**Options:**
- `--no-fallback`  Skip the LLM step and only use heuristics.
- `-h`, `--help`   Show this help message.

**Environment Variables:**
- `CODEX_NO_LLM`     Equivalent to `--no-fallback`.
- `CODEX_LLM_MODEL` Model to use for fallback (default: `gpt-4.1-mini`).

**Examples:**
```shell
codex ask "Where is the login function?"
codex ask --no-fallback "List all tasks in the current plan"
```  