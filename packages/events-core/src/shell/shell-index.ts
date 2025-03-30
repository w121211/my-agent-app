#!/usr/bin/env node
import { CliShell } from './cli-shell.js';

// Start the application
const shell = new CliShell();
shell.start().catch((error) => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
