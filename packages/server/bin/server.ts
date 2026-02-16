#!/usr/bin/env bun

/**
 * AgentX Server - Standalone server startup script
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-xxx bun run bin/server.ts
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY - Required: Claude API key
 *   ANTHROPIC_BASE_URL - Optional: Custom API endpoint
 *   PORT - Server port (default: 5200)
 *   HOST - Server host (default: 0.0.0.0)
 *   DATA_PATH - Data storage path (default: ./data)
 *   LOG_LEVEL - Log level: debug/info/warn/error (default: info)
 */

import type { CreateDriver } from "@agentxjs/core/driver";
import { createMonoDriver } from "@agentxjs/mono-driver";
import { nodePlatform } from "@agentxjs/node-platform";
import { createLogger } from "commonxjs/logger";
import { createServer } from "../src";

const logger = createLogger("server/bin");

async function main() {
  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error("  ANTHROPIC_API_KEY=sk-xxx bun run bin/server.ts");
    process.exit(1);
  }

  // Configuration from environment
  const port = parseInt(process.env.PORT ?? "5200", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  const dataPath = process.env.DATA_PATH ?? "./data";
  const logDir = process.env.LOG_DIR ?? `${dataPath}/logs`;
  const debug = process.env.LOG_LEVEL === "debug";

  logger.info("Starting AgentX Server", {
    port,
    host,
    dataPath,
    logDir,
    debug,
  });

  // Create driver factory that injects apiKey/baseUrl
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  const wrappedCreateDriver: CreateDriver = (config) => {
    return createMonoDriver({
      ...config,
      apiKey,
      baseUrl,
      options: { provider: "anthropic" },
    });
  };

  // Create server with nodePlatform + driver
  const server = await createServer({
    platform: nodePlatform({
      dataPath,
      logDir,
    }),
    createDriver: wrappedCreateDriver,
    port,
    host,
    debug,
  });

  // Start listening
  await server.listen();

  logger.info("AgentX Server started", {
    url: `ws://${host}:${port}`,
  });

  // Handle shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    await server.dispose();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
