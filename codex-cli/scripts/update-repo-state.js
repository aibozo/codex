#!/usr/bin/env node
import { classifyRepo } from "../src/utils/repo-classifier.js";

const state = classifyRepo();
// eslint-disable-next-line no-console
console.log("Repo classified as", state.label, `(conf ${state.confidence.toFixed(2)})`);
