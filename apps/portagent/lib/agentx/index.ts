/**
 * AgentX Server Bootstrap for Portagent
 *
 * Initializes AgentX WebSocket server with:
 * - NodePlatform (SQLite persistence)
 * - MonoDriver (Vercel AI SDK, multi-provider)
 *
 * Architecture:
 *   Browser (agentxjs RemoteClient)
 *     -> WebSocket /ws
 *     -> @agentxjs/server (JSON-RPC 2.0)
 *     -> MonoDriver
 *     -> Claude API (or other LLM)
 */

import { createServer, type ServerConfig } from "@agentxjs/server";
import { nodePlatform } from "@agentxjs/node-platform";
import { createMonoDriver } from "@agentxjs/mono-driver";
import type { DriverConfig } from "@agentxjs/core/driver";
import type { MonoDriverOptions } from "@agentxjs/mono-driver";
import { createLogger } from "commonxjs/logger";
import { join } from "node:path";

const logger = createLogger("portagent/agentx");

/**
 * Singleton server instance
 */
let serverInstance: Awaited<ReturnType<typeof createServer>> | null = null;
let serverStarting: Promise<void> | null = null;

/**
 * Resolve LLM configuration from environment variables
 */
function getLLMConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.DEEPRACTICE_API_KEY || "";
  const model = process.env.DEEPRACTICE_MODEL || "claude-sonnet-4-20250514";
  const baseUrl = process.env.DEEPRACTICE_BASE_URL || undefined;
  const provider = baseUrl ? ("openai-compatible" as const) : ("anthropic" as const);

  return { apiKey, model, baseUrl, provider };
}

/**
 * Start the AgentX WebSocket server
 *
 * Uses standalone mode (creates its own HTTP server on a separate port)
 * because Next.js does not expose its underlying HTTP server.
 *
 * The WebSocket server runs on port 5200 (or WS_PORT env var).
 */
export async function startAgentXServer(): Promise<void> {
  // Prevent double-start
  if (serverInstance) {
    logger.info("AgentX server already running");
    return;
  }

  if (serverStarting) {
    await serverStarting;
    return;
  }

  serverStarting = (async () => {
    try {
      const llmConfig = getLLMConfig();
      const wsPort = parseInt(process.env.WS_PORT || "5200", 10);
      const dataPath = join(process.cwd(), "data", "agentx");

      logger.info("Starting AgentX server", {
        wsPort,
        dataPath,
        provider: llmConfig.provider,
        model: llmConfig.model,
        hasApiKey: !!llmConfig.apiKey,
      });

      const config: ServerConfig = {
        platform: nodePlatform({ dataPath }),
        createDriver: (driverConfig: DriverConfig) => {
          const monoConfig: DriverConfig<MonoDriverOptions> = {
            ...driverConfig,
            apiKey: llmConfig.apiKey || driverConfig.apiKey,
            model: llmConfig.model || driverConfig.model,
            baseUrl: llmConfig.baseUrl || driverConfig.baseUrl,
            options: {
              provider: llmConfig.provider,
              ...(llmConfig.provider === "openai-compatible" && llmConfig.baseUrl
                ? {
                    compatibleConfig: {
                      name: "deepractice",
                      baseURL: llmConfig.baseUrl,
                      apiKey: llmConfig.apiKey,
                    },
                  }
                : {}),
            },
          };
          return createMonoDriver(monoConfig);
        },
        port: wsPort,
        host: "0.0.0.0",
      };

      serverInstance = await createServer(config);
      await serverInstance.listen();

      logger.info("AgentX WebSocket server started", {
        url: `ws://localhost:${wsPort}/ws`,
      });
    } catch (error) {
      logger.error("Failed to start AgentX server", {
        error: error instanceof Error ? error.message : String(error),
      });
      serverInstance = null;
      throw error;
    } finally {
      serverStarting = null;
    }
  })();

  await serverStarting;
}

/**
 * Stop the AgentX server
 */
export async function stopAgentXServer(): Promise<void> {
  if (serverInstance) {
    await serverInstance.dispose();
    serverInstance = null;
    logger.info("AgentX server stopped");
  }
}

/**
 * Get the WebSocket URL for the AgentX server
 */
export function getAgentXWsUrl(): string {
  const wsPort = parseInt(process.env.WS_PORT || "5200", 10);
  return `ws://localhost:${wsPort}/ws`;
}
