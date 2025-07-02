#!/usr/bin/env node
// Generic agent worker: waits for JSON messages on stdin, responds to ping.

import { onJson, sendJson } from "../src/utils/ipc.js";
import { exec } from "child_process";

// Signal ready
sendJson(process.stdout, { type: "ready" });

onJson(process.stdin, (msg) => {
  if (msg.type === "ping") {
    sendJson(process.stdout, { type: "pong" });
    return;
  }
  if (msg.type === "runTask") {
    const { taskId, check_cmd } = msg;

    let cmd = check_cmd;
    if (!cmd || cmd.trim().length === 0) {
      const workerName = process.env.WORKER_NAME || "";
      if (workerName === "test-bot") cmd = "npm test --silent";
      else if (workerName === "doc-bot") cmd = "echo 'generate docs'";
      else cmd = "echo ok";
    }
    const child = exec(cmd, { shell: "/bin/bash" }, (err) => {
      // stub usage numbers
      const usage = { prompt_tokens: 10, completion_tokens: 30, cost: 0.0005 };
      sendJson(process.stdout, {
        type: "taskDone",
        taskId,
        status: err ? "failed" : "done",
        usage,
      });
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  }
});
