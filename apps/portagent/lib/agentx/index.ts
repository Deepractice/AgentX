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

import { join } from "node:path";
import type { DriverConfig } from "@agentxjs/core/driver";
import type { MonoDriverOptions } from "@agentxjs/mono-driver";
import { createMonoDriver } from "@agentxjs/mono-driver";
import { nodePlatform } from "@agentxjs/node-platform";
import { createServer, type ServerConfig } from "@agentxjs/server";
import { createLogger } from "commonxjs/logger";
import { SystemConfigRepository } from "@/lib/db/repositories";

const logger = createLogger("portagent/agentx");

/**
 * Singleton server instance
 */
let serverInstance: Awaited<ReturnType<typeof createServer>> | null = null;
let serverStarting: Promise<void> | null = null;

/**
 * Resolve LLM configuration from environment variables (fallback)
 */
function getLLMConfigFromEnv() {
  const apiKey = process.env.DEEPRACTICE_API_KEY || "";
  const model = process.env.DEEPRACTICE_MODEL || "claude-sonnet-4-20250514";
  const baseUrl = process.env.DEEPRACTICE_BASE_URL || undefined;
  const provider = baseUrl ? ("openai-compatible" as const) : ("anthropic" as const);

  return { apiKey, model, baseUrl, provider };
}

/**
 * Resolve LLM configuration from DB first, then fallback to env vars
 */
function getLLMConfigFromDB() {
  try {
    const apiKey =
      SystemConfigRepository.get("llm.apiKey") || process.env.DEEPRACTICE_API_KEY || "";
    const model =
      SystemConfigRepository.get("llm.model") ||
      process.env.DEEPRACTICE_MODEL ||
      "claude-sonnet-4-20250514";
    const baseUrl =
      SystemConfigRepository.get("llm.baseUrl") || process.env.DEEPRACTICE_BASE_URL || undefined;
    const storedProvider = SystemConfigRepository.get("llm.provider");
    const provider =
      storedProvider === "openai-compatible"
        ? ("openai-compatible" as const)
        : ("anthropic" as const);

    return { apiKey, model, baseUrl, provider };
  } catch {
    return getLLMConfigFromEnv();
  }
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
      const initialConfig = getLLMConfigFromDB();
      const wsPort = parseInt(process.env.WS_PORT || "5200", 10);
      const dataPath = join(process.cwd(), "data", "agentx");

      logger.info("Starting AgentX server", {
        wsPort,
        dataPath,
        provider: initialConfig.provider,
        model: initialConfig.model,
        hasApiKey: !!initialConfig.apiKey,
      });

      const config: ServerConfig = {
        platform: nodePlatform({ dataPath }),
        createDriver: (driverConfig: DriverConfig) => {
          // Read latest config from DB on each agent creation
          const llm = getLLMConfigFromDB();
          const monoConfig: DriverConfig<MonoDriverOptions> = {
            ...driverConfig,
            apiKey: llm.apiKey || driverConfig.apiKey,
            model: llm.model || driverConfig.model,
            baseUrl: llm.baseUrl || driverConfig.baseUrl,
            options: {
              provider: llm.provider,
              ...(llm.provider === "openai-compatible" && llm.baseUrl
                ? {
                    compatibleConfig: {
                      name: "deepractice",
                      baseURL: llm.baseUrl,
                      apiKey: llm.apiKey,
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
