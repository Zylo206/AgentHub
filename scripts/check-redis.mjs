#!/usr/bin/env node

import net from "node:net";

function parseRedisUrl(value) {
  const url = new URL(value || "redis://127.0.0.1:6379");
  return {
    host: url.hostname,
    port: Number.parseInt(url.port || "6379", 10),
    password: decodeURIComponent(url.password || "")
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

async function pingRedis(config) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    let buffer = "";
    socket.setTimeout(5000);
    socket.on("connect", () => {
      if (config.password) {
        socket.write(`*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(config.password)}\r\n${config.password}\r\n`);
      }
      socket.write("*1\r\n$4\r\nPING\r\n");
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (buffer.includes("+PONG")) {
        socket.end();
        resolve(buffer);
      }
    });
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Redis ping timed out."));
    });
    socket.on("error", reject);
    socket.on("end", () => {
      if (!buffer.includes("+PONG")) {
        reject(new Error(buffer.trim() || "Redis connection closed before PONG."));
      }
    });
  });
}

async function main() {
  const config = parseRedisUrl(process.env.REDIS_URL);
  console.log(`Redis target: ${config.host}:${config.port}`);
  await pingRedis(config);
  pass("Redis PING returned PONG");
}

main().catch((error) => fail("Redis health check failed", error));

