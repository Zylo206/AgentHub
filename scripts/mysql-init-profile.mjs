#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SCHEMA_PATH = resolve(REPO_ROOT, "backend", "src", "main", "resources", "schema-jdbc.sql");

function parseJdbcUrl(jdbcUrl) {
  const match = String(jdbcUrl || "").match(/^jdbc:mysql:\/\/([^:/?]+)(?::(\d+))?\/([^?]+)/i);
  if (!match) {
    return {};
  }

  return {
    host: match[1],
    port: match[2] || "3306",
    database: decodeURIComponent(match[3])
  };
}

function getConfig() {
  const parsedJdbc = parseJdbcUrl(process.env.AGENTHUB_JDBC_URL);
  const database = process.env.AGENTHUB_MYSQL_DATABASE || parsedJdbc.database || "agenthub";
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("Database name must contain only letters, numbers, and underscores.");
  }

  return {
    command: process.env.AGENTHUB_MYSQL_COMMAND || "mysql",
    host: process.env.AGENTHUB_MYSQL_HOST || parsedJdbc.host || "127.0.0.1",
    port: process.env.AGENTHUB_MYSQL_PORT || parsedJdbc.port || "3306",
    database,
    username: process.env.AGENTHUB_MYSQL_USERNAME || process.env.AGENTHUB_JDBC_USERNAME || "root",
    password: process.env.AGENTHUB_MYSQL_PASSWORD ?? process.env.AGENTHUB_JDBC_PASSWORD ?? "",
    skipCreateDatabase: String(process.env.AGENTHUB_MYSQL_SKIP_CREATE_DATABASE || "").toLowerCase() === "true"
  };
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

function mysqlBaseArgs(config) {
  return [
    "--protocol=TCP",
    "-h",
    config.host,
    "-P",
    String(config.port),
    "-u",
    config.username,
    "--default-character-set=utf8mb4"
  ];
}

function runMysql(config, args, input = "") {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(config.command, args, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        MYSQL_PWD: config.password
      },
      shell: false,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(`Failed to start mysql command '${config.command}': ${error.message}`));
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`mysql terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error((stderr || stdout || `mysql exited with code ${code}`).trim()));
        return;
      }
      resolvePromise(stdout.trim());
    });

    child.stdin.end(input);
  });
}

async function main() {
  const config = getConfig();
  const connectionArgs = mysqlBaseArgs(config);

  console.log("AgentHub MySQL profile initializer");
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.username}`);
  console.log(`Schema: ${SCHEMA_PATH}`);
  console.log("Password: provided through environment (not printed)");

  if (!config.skipCreateDatabase) {
    await runMysql(
      config,
      [
        ...connectionArgs,
        "-e",
        `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
      ]
    );
    pass(`database ready: ${config.database}`);
  } else {
    pass("database creation skipped by AGENTHUB_MYSQL_SKIP_CREATE_DATABASE=true");
  }

  const schemaSql = await readFile(SCHEMA_PATH, "utf8");
  await runMysql(config, [...connectionArgs, config.database], schemaSql);
  pass("schema-jdbc.sql applied");

  const tableCount = await runMysql(
    config,
    [
      ...connectionArgs,
      "-N",
      "-B",
      "-e",
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${config.database}' AND table_name LIKE 'agenthub_%';`
    ]
  );
  pass(`agenthub tables visible: ${tableCount || "0"}`);

  console.log("MySQL profile initialization completed.");
  console.log("Start backend with:");
  console.log(`  AGENTHUB_PERSISTENCE_MODE=jdbc`);
  console.log(`  AGENTHUB_JDBC_URL=jdbc:mysql://${config.host}:${config.port}/${config.database}?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC`);
  console.log(`  AGENTHUB_JDBC_USERNAME=${config.username}`);
  console.log("  AGENTHUB_JDBC_PASSWORD=<set in your shell>");
}

main().catch((error) => fail("MySQL profile initialization failed", error));
