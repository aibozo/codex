#!/usr/bin/env node
(async () => {
  try {
    await import('../dist/cli.js');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
