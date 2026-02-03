/**
 * AgentX CLI - Terminal UI Client
 *
 * Starts an embedded server and connects to it automatically.
 * If a server is already running on the port, connects to it instead.
 * Use --server to connect to an external server.
 */

import "dotenv/config";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { tui } from "./app";
import { createServer } from "@agentxjs/server";
import { nodeProvider, FileLoggerFactory } from "@agentxjs/node-provider";
import { createClaudeDriver } from "@agentxjs/claude-driver";
import { createLogger, setLoggerFactory } from "commonxjs/logger";
import { connect } from "net";

// Configure file logging early (before any logger is used)
const dataPath = process.env.DATA_PATH ?? "./.agentx";
const logDir = `${dataPath}/logs`;
setLoggerFactory(new FileLoggerFactory({ logDir, level: "debug" }));

const logger = createLogger("cli");

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1");
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Start embedded server or connect to existing
 */
async function getServerUrl(port: number): Promise<{ url: string; cleanup?: () => Promise<void> }> {
  const url = `ws://127.0.0.1:${port}`;

  // Check if server already running
  if (await isPortInUse(port)) {
    logger.info("Found existing server", { port });
    return { url };
  }

  // Validate API key for starting new server
  const apiKey = process.env.DEEPRACTICE_API_KEY;
  if (!apiKey) {
    console.error("Error: DEEPRACTICE_API_KEY environment variable is required");
    console.error("");
    console.error("Create a .env.local file with:");
    console.error("  DEEPRACTICE_API_KEY=sk-xxx");
    process.exit(1);
  }

  const server = await createServer({
    provider: nodeProvider({
      dataPath,
      createDriver: createClaudeDriver,
      // logDir already configured at startup
    }),
    port,
    host: "127.0.0.1",
  });

  await server.listen();

  logger.info("Embedded server started", { port });

  return {
    url,
    cleanup: async () => {
      await server.dispose();
    },
  };
}

// Parse args and run
yargs(hideBin(process.argv))
  .scriptName("agentx")
  .usage("$0 [command] [options]")
  .command(
    ["$0", "chat"],
    "Start interactive chat session",
    (yargs) =>
      yargs
        .option("server", {
          alias: "s",
          type: "string",
          description: "Connect to external AgentX server URL (default: start embedded server)",
        })
        .option("port", {
          alias: "p",
          type: "number",
          default: 5200,
          description: "Port for embedded server",
        })
        .option("theme", {
          alias: "t",
          type: "string",
          description: "Theme name",
        }),
    async (args) => {
      let serverUrl = args.server;
      let cleanup: (() => Promise<void>) | undefined;

      // If no external server specified, use embedded or existing server
      if (!serverUrl) {
        const result = await getServerUrl(args.port);
        serverUrl = result.url;
        cleanup = result.cleanup;
      }

      try {
        await tui({
          serverUrl,
          theme: args.theme,
        });
      } finally {
        if (cleanup) {
          await cleanup();
        }
      }
    }
  )
  .help()
  .parseAsync();
