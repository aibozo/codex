import { Readable, Writable } from "node:stream";

export type JSONMessage = Record<string, unknown> & { type: string };

export interface RunTaskMsg extends JSONMessage {
  type: "runTask";
  taskId: string;
  planPath: string;
  check_cmd?: string;
}

export interface TaskDoneMsg extends JSONMessage {
  type: "taskDone";
  taskId: string;
  status: "done" | "failed";
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    cost: number; // USD
  };
}

export function sendJson(stream: Writable | null | undefined, msg: JSONMessage): void {
  if (!stream || typeof (stream as any).write !== "function") return;
  stream.write(JSON.stringify(msg) + "\n");
}

export function onJson(stream: Readable | null, handler: (msg: JSONMessage) => void): void {
  if (!stream || typeof stream.on !== "function") return;
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buf += chunk;
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        handler(obj);
      } catch {
        /* ignore malformed */
      }
    }
  });
}
