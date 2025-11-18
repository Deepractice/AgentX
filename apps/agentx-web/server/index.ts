/**
 * AgentX Web Server
 *
 * Simple HTTP + WebSocket server:
 * - WebSocket server for AI agent communication (using agentx-framework)
 * - Static file serving (production only)
 */

import { createWebSocketServer, ClaudeAgent } from "@deepractice-ai/agentx-framework";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

const isDev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT || "5200", 10);
const HOST = process.env.HOST || "0.0.0.0";

async function startServer() {
  // Get API key from environment
  const apiKey = process.env.AGENTX_API_KEY;
  const baseUrl = process.env.AGENTX_BASE_URL;
  const model = process.env.AGENTX_MODEL || "claude-sonnet-4-5-20250929";

  if (!apiKey) {
    console.error("❌ AGENTX_API_KEY environment variable is required");
    console.log("\nPlease create .env.local file with:");
    console.log("  AGENTX_API_KEY=your-api-key");
    process.exit(1);
  }

  console.log("🚀 Starting AgentX Web Server...\n");
  console.log("📝 Configuration:");
  console.log(`   Mode: ${isDev ? "development" : "production"}`);
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  if (baseUrl) {
    console.log(`   Base URL: ${baseUrl}`);
  }
  console.log(`   Model: ${model}`);
  console.log();

  // Create WebSocket Server using agentx-framework
  const wsServer = createWebSocketServer({
    // Agent definition
    agentDefinition: ClaudeAgent,

    // Agent config factory
    createAgentConfig: () => ({
      apiKey,
      baseUrl,
      model,
      systemPrompt: "You are a helpful AI assistant.",
    }),

    // Server configuration
    port: PORT,
    host: HOST,
    path: "/ws",
  });

  console.log(`✅ WebSocket Server: ws://${HOST}:${PORT}/ws`);
  console.log();
  console.log("💡 Ready!");
  if (isDev) {
    console.log("   Frontend: http://localhost:5173 (Vite dev server)");
    console.log("   Backend:  ws://localhost:5200/ws (WebSocket only)");
  } else {
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  }
  console.log();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n\n🛑 Shutting down...");
    await wsServer.close();
    console.log("✅ Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
