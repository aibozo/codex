import { afterEach, beforeEach, expect, test } from "vitest";
import { clearMemoryStore } from "../src/utils/memory-store.js";

import {
  addTriple,
  findTriples,
  buildFocusWindow,
} from "../src/utils/memory-store.js";

beforeEach(() => clearMemoryStore());
afterEach(() => clearMemoryStore());

test("add and retrieve triples", () => {
  addTriple({ subject: "fileA.ts", predicate: "imports", object: "fileB.ts" });
  addTriple({ subject: "task-1", predicate: "blocks", object: "task-2" });

  const res = findTriples({ predicate: "imports", subject: "fileA.ts" });
  expect(res.length).toBe(1);
});

test("focus window returns recent snippets", () => {
  for (let i = 0; i < 5; i++) {
    addTriple({ subject: `s${i}`, predicate: "rel", object: "o", ts: Date.now() + i });
  }
  const window = buildFocusWindow(3);
  expect(window.length).toBe(3);
  expect(window[0].snippet.startsWith("s4")).toBe(true);
});

test("objective boost ranks matching triples higher", () => {
  addTriple({ subject: "foo", predicate: "rel", object: "my-obj" });
  // older triple without match but recency high
  addTriple({ subject: "bar", predicate: "rel", object: "x", ts: Date.now() + 1 });

  const win = buildFocusWindow(2, "my-obj");
  // snippet containing my-obj should come first due to boost
  expect(win[0].snippet.includes("my-obj")).toBe(true);
});
