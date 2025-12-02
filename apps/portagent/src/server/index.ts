/**
 * Portagent Server
 *
 * Hono-based server that combines:
 * - AgentX API (SSE, agents, sessions)
 * - Authentication (simple password + JWT)
 * - Static file serving (Vite build output)
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync, readFileSync } from "fs";

import { createAgentX, defineAgent } from "agentxjs";
import { createAgentXHandler, type AgentXHandlerWithUtils } from "agentxjs/server";
import { toHonoHandler } from "agentxjs/server/adapters/hono";
import { nodeRuntime } from "@agentxjs/node-runtime";
import { homedir } from "node:os";
import { join } from "node:path";

import { createAuthMiddleware, authRoutes } from "./auth";
import { SQLiteUserRepository } from "./database";
import { createOwnershipHandler } from "./ownership";

// Configuration from environment
const PORT = parseInt(process.env.PORT || "5200", 10);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomUUID();
const USER_DB_PATH = process.env.USER_DB_PATH || join(homedir(), ".agentx/data/portagent.db");

/**
 * Default Agent Definition
 */
const DefaultAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "You are a helpful AI assistant.",
});

/**
 * Create and configure the Hono app
 */
function createApp() {
  const app = new Hono();

  // CORS
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Create runtime and AgentX instance
  const runtime = nodeRuntime();
  const agentx = createAgentX(runtime);

  // Register default definition
  agentx.definitions.register(DefaultAgent);

  // Create AgentX handler
  const agentxHandler = createAgentXHandler(agentx, {
    basePath: "/agentx",
    allowDynamicCreation: true,
    allowedDefinitions: ["Assistant"],
    repository: runtime.repository,
  }) as AgentXHandlerWithUtils;

  // Register definition with handler
  agentxHandler.registerDefinition("Assistant", DefaultAgent);

  // Initialize user repository (separate database)
  const userRepository = new SQLiteUserRepository(USER_DB_PATH);

  // Auth middleware
  const authMiddleware = createAuthMiddleware(JWT_SECRET);

  // ============================================================
  // Routes
  // ============================================================

  // Health check (no auth)
  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

  // Auth routes (register, login)
  app.route("/api/auth", authRoutes(userRepository, JWT_SECRET, agentx));

  // AgentX API (protected with ownership validation)
  const ownershipHandler = createOwnershipHandler(agentx, agentxHandler);
  app.use("/agentx/*", authMiddleware);
  app.all("/agentx/*", toHonoHandler(ownershipHandler));

  // Static files (protected in production)
  const publicDir = resolve(__dirname, "../public");
  const isDev = process.env.NODE_ENV !== "production";

  if (existsSync(publicDir)) {
    // Serve static files
    app.use("/*", serveStatic({ root: publicDir }));

    // SPA fallback - serve index.html for all unmatched routes
    app.get("*", (c) => {
      const indexPath = resolve(publicDir, "index.html");
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, "utf-8");
        return c.html(html);
      }
      return c.text("Not Found", 404);
    });
  } else if (isDev) {
    // In dev mode, proxy to Vite
    app.get("*", (c) => {
      return c.text(
        "Static files not found. Run 'pnpm build:client' first, or use 'pnpm dev' for development.",
        404
      );
    });
  }

  return { app, agentx, userRepository };
}

/**
 * Start the server
 */
async function startServer() {
  // Check API key
  if (!process.env.LLM_PROVIDER_KEY) {
    console.error("Error: LLM_PROVIDER_KEY is required");
    console.log("\nSet it via environment variable:");
    console.log("  export LLM_PROVIDER_KEY=sk-ant-xxx");
    process.exit(1);
  }

  const { app, agentx, userRepository } = createApp();

  console.log(`
  ____            _                         _
 |  _ \\ ___  _ __| |_ __ _  __ _  ___ _ __ | |_
 | |_) / _ \\| '__| __/ _\` |/ _\` |/ _ \\ '_ \\| __|
 |  __/ (_) | |  | || (_| | (_| |  __/ | | | |_
 |_|   \\___/|_|   \\__\\__,_|\\__, |\\___|_| |_|\\__|
                           |___/

  AgentX Portal - Your AI Agent Gateway (Multi-User Mode)
`);

  console.log("Configuration:");
  console.log(`  Port: ${PORT}`);
  console.log(`  API Key: ${process.env.LLM_PROVIDER_KEY!.substring(0, 15)}...`);
  console.log(`  User DB: ${USER_DB_PATH}`);
  console.log(`  AgentX DB: ${join(homedir(), ".agentx/data/agentx.db")}`);

  console.log(`\nEndpoints:`);
  console.log(`  GET  /health                    - Health check`);
  console.log(`  POST /api/auth/register         - Register new user`);
  console.log(`  POST /api/auth/login            - Login`);
  console.log(`  GET  /api/auth/verify           - Verify token`);
  console.log(`  ---  AgentX API (protected) ---`);
  console.log(`  GET  /agentx/info               - Platform info`);
  console.log(`  GET  /agentx/containers         - List containers`);
  console.log(`  POST /agentx/containers         - Create container`);
  console.log(`  GET  /agentx/containers/:id     - Get container`);
  console.log(`  DELETE /agentx/containers/:id   - Delete container`);
  console.log(`  POST /agentx/agents             - Create agent`);
  console.log(`  GET  /agentx/agents/:id/sse     - SSE stream`);
  console.log(`  POST /agentx/agents/:id/messages- Send message`);

  serve({
    fetch: app.fetch,
    port: PORT,
    hostname: "0.0.0.0",
  });

  console.log(`\n🚀 Server running at http://localhost:${PORT}`);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await agentx.agents.destroyAll();
    userRepository.close();
    console.log("Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export { createApp, startServer };
