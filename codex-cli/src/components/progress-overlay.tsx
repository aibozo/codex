import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";
import fs from "fs";
import path from "path";

import { loadPlan, type Plan } from "../utils/task-dag.js";

interface Props {
  plansDir: string;
  onExit: () => void;
}

export default function ProgressOverlay({ plansDir, onExit }: Props): JSX.Element {
  const [plan, setPlan] = useState<Plan | null>(null);

  useInput((_i, key) => {
    if (key.escape || _i === "g") onExit();
  });

  useEffect(() => {
    function latestPlanPath(): string | null {
      if (!fs.existsSync(plansDir)) return null;
      const files = fs
        .readdirSync(plansDir)
        .filter((f) => f.endsWith(".yaml"))
        .sort()
        .reverse();
      return files[0] ? path.join(plansDir, files[0]) : null;
    }

    function refresh() {
      const p = latestPlanPath();
      if (!p) return;
      try {
        const pl = loadPlan(p);
        setPlan(pl);
      } catch {
        /* ignore parse errors */
      }
    }

    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [plansDir]);

  if (!plan) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text>No plan found.</Text>
      </Box>
    );
  }

  const total = plan.tasks.length;
  const done = plan.tasks.filter((t) => t.status === "done").length;
  const failed = plan.tasks.filter((t) => t.status === "failed").length;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" paddingX={1} width={80}>
      <Text bold>
        Plan progress: {plan.title ?? plan.objective_id} – {done}/{total} done, {failed} failed
      </Text>
      {plan.tasks.slice(0, 20).map((t) => {
        let color: string | undefined;
        if (t.status === "failed") color = "red";
        else if (t.status === "done") color = "green";
        else if (t.status === "running") color = "yellow";
        return (
          <Text key={t.task_id} color={color}>
            {statusGlyph(t.status)} {t.task_id} {t.title ? `– ${t.title}` : ""}
          </Text>
        );
      })}
      {total > 20 && <Text dimColor>… {total - 20} more tasks</Text>}
      <Text dimColor>g / esc to close</Text>
    </Box>
  );
}

function statusGlyph(s?: string) {
  switch (s) {
    case "done":
      return "✔";
    case "failed":
      return "✖";
    case "running":
      return "●";
    default:
      return "○";
  }
}
