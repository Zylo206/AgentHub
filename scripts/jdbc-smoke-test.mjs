#!/usr/bin/env node

import { spawn } from "node:child_process";

const requiredEnv = ["AGENTHUB_API_BASE_URL"];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(`[WARN] Missing ${missing.join(", ")}; using smoke-test defaults where available.`);
}

const env = {
  ...process.env,
  AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE: "true",
  AGENTHUB_PERSISTENCE_MODE: process.env.AGENTHUB_PERSISTENCE_MODE || "jdbc"
};

console.log("AgentHub JDBC smoke test");
console.log(`API base: ${env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080"}`);
console.log("Expected backend mode: jdbc");
console.log("Run backend with AGENTHUB_PERSISTENCE_MODE=jdbc and a configured AGENTHUB_JDBC_URL before this script.");

const child = spawn(process.execPath, ["scripts/smoke-test.mjs"], {
  stdio: "inherit",
  env,
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[FAIL] JDBC smoke test terminated by signal ${signal}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
