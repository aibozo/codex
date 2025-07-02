# codex ask

**Usage:**
```
codex ask [--no-fallback] "your question"
```

**Description:**
Answers natural-language questions about your repository's code map.

1. Performs a fast local heuristic lookup (symbols, modules, tasks).
2. If no answer found and fallback is enabled, sends your question along with a brief
   map summary to an LLM (default `gpt-4.1-mini`).

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