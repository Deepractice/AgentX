#!/usr/bin/env node
/**
 * Portagent CLI
 *
 * Command-line interface for running the Portagent server.
 *
 * Usage:
 *   portagent                       # Start with defaults
 *   portagent -p 3000               # Custom port
 *   portagent --env-file .env.prod  # Load custom env file
 */

import { Command } from "commander";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const program = new Command();

program
  .name("portagent")
  .description("Portagent - AgentX Portal Application")
  .version("0.0.1")
  .option("-p, --port <port>", "Port to listen on", "5200")
  .option("-e, --env-file <path>", "Path to environment file")
  .option("--password <password>", "Set login password (or use PORTAGENT_PASSWORD env var)")
  .option("--jwt-secret <secret>", "JWT secret for token signing (or use JWT_SECRET env var)")
  .option("--api-key <key>", "LLM provider API key (or use LLM_PROVIDER_KEY env var)")
  .option("--api-url <url>", "LLM provider base URL (or use LLM_PROVIDER_URL env var)")
  .option("--model <model>", "LLM model name (or use LLM_PROVIDER_MODEL env var)")
  .action(async (options) => {
    // Load env file (CLI option takes priority, then defaults)
    if (options.envFile) {
      const envPath = resolve(process.cwd(), options.envFile);
      if (!existsSync(envPath)) {
        console.error(`Error: Environment file not found: ${envPath}`);
        process.exit(1);
      }
      config({ path: envPath });
    } else {
      // Default: load .env and .env.local from current directory
      config({ path: resolve(process.cwd(), ".env") });
      config({ path: resolve(process.cwd(), ".env.local") });
    }

    // Set environment variables from CLI options (override env file)
    if (options.port) {
      process.env.PORT = options.port;
    }
    if (options.password) {
      process.env.PORTAGENT_PASSWORD = options.password;
    }
    if (options.jwtSecret) {
      process.env.JWT_SECRET = options.jwtSecret;
    }
    if (options.apiKey) {
      process.env.LLM_PROVIDER_KEY = options.apiKey;
    }
    if (options.apiUrl) {
      process.env.LLM_PROVIDER_URL = options.apiUrl;
    }
    if (options.model) {
      process.env.LLM_PROVIDER_MODEL = options.model;
    }

    // Import and start server
    const { startServer } = await import("../server/index.js");
    await startServer();
  });

program.parse();
