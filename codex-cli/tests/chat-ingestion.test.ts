import { expect, test, beforeEach } from "vitest";

import { addTriple, findTriples, clearMemoryStore } from "../src/utils/memory-store.js";
beforeEach(() => clearMemoryStore());

test("chat ingestion writes asked/answered triples", () => {
  addTriple({ subject: "session", predicate: "asked", object: "msg1" });
  addTriple({ subject: "session", predicate: "answered", object: "msg1" });

  const asked = findTriples({ predicate: "asked" });
  const answered = findTriples({ predicate: "answered" });

  expect(asked.length).toBeGreaterThan(0);
  expect(answered.length).toBeGreaterThan(0);
});
