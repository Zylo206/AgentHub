#!/usr/bin/env node

const API_BASE_URL = process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080";
const USERNAME = process.env.AGENTHUB_OBJECT_STORAGE_ADMIN_USERNAME || "admin";
const PASSWORD = process.env.AGENTHUB_OBJECT_STORAGE_ADMIN_PASSWORD || "admin";
const BUCKETS = (process.env.AGENTHUB_OBJECT_STORAGE_BUCKETS || "attachments,doc-collab-snapshots")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

async function api(path, init = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload?.data;
}

async function login() {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  return result.token;
}

async function main() {
  const token = await login();
  for (const bucket of BUCKETS) {
    const result = await api(
      `/api/admin/object-storage/buckets/${encodeURIComponent(bucket)}/ensure`,
      { method: "POST" },
      token
    );
    pass(`bucket ensured: ${result.bucket} provider=${result.provider} configured=${result.configured}`);
  }
}

main().catch((error) => fail("Object-storage bucket initialization failed", error));

