/**
 * Development Server for @agentxjs/ui
 *
 * Simple WebSocket server for Storybook UI development.
 * Uses createAgentX in local mode with WebSocket server capability.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { FileLoggerFactory } from "./FileLogger.js";
import { ClaudeAgent } from "./agent.js";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from dev/.env.local or dev/.env.test
const devDir = resolve(__dirname, "..");
const envPath = resolve(devDir, ".env.local");
config({ path: envPath });

async function startDevServer() {
  // Use same env vars as portagent for consistency
  const apiKey = process.env.LLM_PROVIDER_KEY;
  const baseUrl = process.env.LLM_PROVIDER_URL;
  const model = process.env.LLM_PROVIDER_MODEL || "claude-sonnet-4-20250514";

  if (!apiKey) {
    console.error("Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create dev/.env.local file");
    console.log("     LLM_PROVIDER_KEY=your-api-key");
    console.log("  2. export LLM_PROVIDER_KEY='your-api-key'");
    console.log("\nSee dev/.env.example for all available options");
    process.exit(1);
  }

  const PORT = 5200;
  const AGENTX_DIR = resolve(__dirname, "../../.agentx");
  const LOG_DIR = resolve(AGENTX_DIR, "logs");

  console.log("Starting AgentX Development Server...\n");
  console.log("Configuration:");
  console.log(`  API Key: ${apiKey.substring(0, 15)}...`);
  console.log(`  Model: ${model}`);
  if (baseUrl) {
    console.log(`  Base URL: ${baseUrl}`);
  }
  console.log(`  Port: ${PORT}`);
  console.log(`  AgentX Directory: ${AGENTX_DIR}`);
  console.log(`  Storage: SQLite (auto-configured at ${AGENTX_DIR}/data/agentx.db)`);
  console.log(`  Log Directory: ${LOG_DIR}`);
  console.log();

  // Import and create AgentX instance
  const { createAgentX } = await import("agentxjs");

  // Storage is auto-configured: SQLite at {agentxDir}/data/agentx.db
  // defaultAgent is used as base config when creating new images
  const agentx = await createAgentX({
    llm: {
      apiKey,
      baseUrl,
      model,
    },
    logger: {
      level: "debug",
      factory: new FileLoggerFactory("debug", LOG_DIR),
    },
    agentxDir: AGENTX_DIR,
    defaultAgent: ClaudeAgent,
  });

  // Create default container for Studio (single-tenant mode)
  // Container is idempotent - will reuse existing if already created
  try {
    console.log("Creating default container...");
    await agentx.request("container_create_request", {
      containerId: "default",
    });
    console.log("✓ Default container ready");
  } catch (error) {
    console.error("Failed to create default container:", error);
    process.exit(1);
  }

  // Log defaultAgent configuration (images are created on-demand by UI)
  console.log(`✓ Default agent configured: ${ClaudeAgent.name}`);
  console.log(`  - MCP Servers: ${Object.keys(ClaudeAgent.mcpServers || {}).join(", ") || "none"}`);

  // Start WebSocket server
  await agentx.listen(PORT);

  console.log(`\n✓ WebSocket server started on ws://localhost:${PORT}`);
  console.log(`\nReady for Storybook development!`);
  console.log(`\nUsage in browser:`);
  console.log(`  const agentx = await createAgentX({ server: "ws://localhost:${PORT}" });`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await agentx.dispose();
    console.log("Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDevServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
