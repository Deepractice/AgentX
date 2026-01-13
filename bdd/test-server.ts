#!/usr/bin/env bun
/**
 * BDD Test Server
 *
 * Dedicated WebSocket server for BDD tests.
 * Loads API key from dev/.env.local if available (for @integration tests).
 */

import { config } from "dotenv";
import { resolve, join } from "path";

const PORT = 15300;
const AGENTX_DIR = resolve(import.meta.dir, "../.agentx-test");

// Load environment from bdd/.env.local
const ENV_PATH = join(import.meta.dir, ".env.local");
config({ path: ENV_PATH });

async function startTestServer() {
  const apiKey = process.env.LLM_PROVIDER_KEY;
  const baseUrl = process.env.LLM_PROVIDER_URL;
  const model = process.env.LLM_PROVIDER_MODEL || "claude-sonnet-4-20250514";
  const useMock = process.env.MOCK_LLM === "true" || !apiKey;

  console.log("🧪 Starting BDD Test Server...\n");
  console.log("Configuration:");
  console.log(`  Port: ${PORT}`);
  console.log(`  AgentX Directory: ${AGENTX_DIR}`);
  console.log(`  Storage: SQLite (${AGENTX_DIR}/data/queue.db)`);
  console.log(`  Mode: ${useMock ? "Mock (fast, predictable)" : "Real API (slow)"}`);

  if (!useMock && apiKey) {
    console.log(`  API Key: ${apiKey.substring(0, 15)}...`);
    console.log(`  Base URL: ${baseUrl || "(default)"}`);
    console.log(`  Model: ${model}`);
  }
  console.log();

  const { createAgentX } = await import("agentxjs");

  // Setup mock environment if requested
  let environmentFactory;
  if (useMock) {
    const { MockEnvironmentFactory } = await import("./mock");
    environmentFactory = new MockEnvironmentFactory();
    console.log("✓ MockEnvironment configured");
  }

  const agentx = await createAgentX({
    agentxDir: AGENTX_DIR,
    logger: { level: useMock ? "warn" : "debug" }, // Quieter for mock tests
    llm: !useMock && apiKey ? { apiKey, baseUrl, model } : undefined,
    environmentFactory,
  });

  // Create default test container
  console.log("Creating test container...");
  await agentx.request("container_create_request", {
    containerId: "test-container",
  });
  console.log("✓ Test container ready");

  // Start WebSocket server
  await agentx.listen(PORT);

  console.log(`\n✅ Test server started on ws://localhost:${PORT}`);
  console.log(`\nReady for BDD tests!`);
  console.log(`\nPress Ctrl+C to stop\n`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n🛑 Shutting down test server...");
    await agentx.dispose();
    console.log("✅ Test server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startTestServer().catch((error) => {
  console.error("❌ Failed to start test server:", error);
  process.exit(1);
});
