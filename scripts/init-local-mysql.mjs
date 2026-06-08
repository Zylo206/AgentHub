#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(SCRIPT_DIR, "mysql-init-profile.mjs");

const child = spawn(process.execPath, [TARGET], {
  cwd: resolve(SCRIPT_DIR, ".."),
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[FAIL] init-local-mysql terminated by signal ${signal}`);
    process.exit(1);
    return;
  }
  process.exit(code ?? 0);
});

