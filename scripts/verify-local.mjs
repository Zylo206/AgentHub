#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const checks = [
  {
    label: "API smoke",
    script: "scripts/smoke-test.mjs"
  },
  {
    label: "SSE smoke",
    script: "scripts/sse-smoke-test.mjs"
  },
  {
    label: "Browser E2E",
    script: "scripts/e2e-browser.mjs"
  }
];

function runNodeScript(check) {
  return new Promise((resolve, reject) => {
    console.log(`[RUN] ${check.label}: node ${check.script}`);
    const child = spawn(process.execPath, [check.script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`[PASS] ${check.label}`);
        resolve();
        return;
      }
      reject(new Error(`${check.label} failed with exit code ${code}`));
    });
  });
}

async function main() {
  console.log("AgentHub local verification gate");
  console.log("Prerequisites: backend and frontend must already be running.");
  console.log("This wrapper does not replace real Adapter, JDBC, or release-specific opt-in smoke tests.");

  for (const check of checks) {
    await runNodeScript(check);
  }

  console.log("Local verification completed successfully.");
}

main().catch((error) => {
  console.error(`[FAIL] local verification failed: ${error.message}`);
  process.exitCode = 1;
});
