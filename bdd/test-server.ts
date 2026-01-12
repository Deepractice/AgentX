#!/usr/bin/env bun
/**
 * BDD Test Server
 *
 * Dedicated WebSocket server for BDD tests.
 * Runs without API key (tests don't call real Claude API).
 */

import { resolve } from "path";

const PORT = 15300;
const AGENTX_DIR = resolve(import.meta.dir, "../.agentx-test");

async function startTestServer() {
  console.log("🧪 Starting BDD Test Server...\n");
  console.log("Configuration:");
  console.log(`  Port: ${PORT}`);
  console.log(`  AgentX Directory: ${AGENTX_DIR}`);
  console.log(`  Storage: SQLite (${AGENTX_DIR}/data/queue.db)`);
  console.log(`  API Key: None (tests don't call real API)`);
  console.log();

  const { createAgentX } = await import("agentxjs");

  const agentx = await createAgentX({
    agentxDir: AGENTX_DIR,
    logger: { level: "warn" }, // Quiet for tests
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
