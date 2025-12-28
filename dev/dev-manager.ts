#!/usr/bin/env bun
/**
 * Dev Service Manager
 *
 * Unified entry point for managing all development services.
 *
 * Usage:
 *   bun dev                                    # Start portagent (default)
 *   bun dev portagent                          # Start portagent explicitly
 *   bun dev server                             # Start WebSocket server
 *   bun dev storybook                          # Start Storybook
 *   bun dev storybook server                   # Start multiple services
 *   bun dev all                                # Start all dev tools (server + storybook)
 */

import { spawn } from "bun";
import { join } from "path";

// Dev environment config path
const DEV_ENV_PATH = join(import.meta.dir, ".env.local");

const SERVICES = {
  "portagent:server": {
    name: "Portagent Server",
    cmd: "bun",
    args: ["--watch", "apps/portagent/src/server/main.ts"],
    cwd: join(import.meta.dir, ".."),
    port: 5200,
    color: "\x1b[32m", // Green
  },
  "portagent:client": {
    name: "Portagent Client",
    cmd: "bun",
    args: ["--filter", "@agentxjs/portagent", "dev:client"],
    cwd: join(import.meta.dir, ".."),
    port: 5173,
    color: "\x1b[33m", // Yellow
  },
  server: {
    name: "Dev WebSocket Server",
    cmd: "bun",
    args: ["--watch", "dev/server/dev-server.ts"],
    cwd: join(import.meta.dir, ".."),
    port: 5201,
    color: "\x1b[36m", // Cyan
  },
  storybook: {
    name: "Storybook",
    cmd: "bun",
    args: ["../../node_modules/.bin/storybook", "dev", "-p", "6006"],
    cwd: join(import.meta.dir, "storybook"),
    port: 6006,
    color: "\x1b[35m", // Magenta
  },
} as const;

type ServiceName = keyof typeof SERVICES;

const RESET = "\x1b[0m";

class DevManager {
  private processes = new Map<string, any>();

  async start(services: ServiceName[]) {
    console.log("🚀 Starting development services...\n");

    for (const serviceName of services) {
      const service = SERVICES[serviceName];
      console.log(`${service.color}[${service.name}]${RESET} Starting on port ${service.port}...`);

      const proc = spawn({
        cmd: [service.cmd, ...service.args],
        cwd: service.cwd,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
        env: {
          ...process.env,
          DOTENV_CONFIG_PATH: DEV_ENV_PATH,
        },
      });

      this.processes.set(serviceName, proc);

      // Stream output with service prefix
      this.streamOutput(serviceName, proc);
    }

    console.log(`\n✅ Started ${services.length} service(s)\n`);
    console.log("Press Ctrl+C to stop all services\n");

    // Handle graceful shutdown
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());

    // Keep process alive
    await new Promise(() => {});
  }

  private streamOutput(serviceName: ServiceName, proc: any) {
    const service = SERVICES[serviceName];
    const prefix = `${service.color}[${service.name}]${RESET}`;

    if (proc.stdout) {
      (async () => {
        for await (const chunk of proc.stdout) {
          const lines = new TextDecoder().decode(chunk).split("\n");
          for (const line of lines) {
            if (line.trim()) {
              console.log(`${prefix} ${line}`);
            }
          }
        }
      })();
    }

    if (proc.stderr) {
      (async () => {
        for await (const chunk of proc.stderr) {
          const lines = new TextDecoder().decode(chunk).split("\n");
          for (const line of lines) {
            if (line.trim()) {
              console.error(`${prefix} ${line}`);
            }
          }
        }
      })();
    }
  }

  private async shutdown() {
    console.log("\n\n🛑 Shutting down services...");

    for (const [name, proc] of this.processes.entries()) {
      const service = SERVICES[name as ServiceName];
      console.log(`${service.color}[${service.name}]${RESET} Stopping...`);
      proc.kill();
    }

    console.log("\n✅ All services stopped");
    process.exit(0);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes("--help") || args.includes("-h")) {
  console.log("Dev Service Manager - Unified development service launcher\n");
  console.log("Usage:");
  console.log("  bun dev [service...]\n");
  console.log("Available services:");
  console.log("  portagent  - Main web application (5200 + 5173) [default]");
  console.log("  server     - Dev WebSocket server (port 5201)");
  console.log("  storybook  - Component development (port 6006)");
  console.log("  all        - All dev tools (server + storybook)\n");
  console.log("Examples:");
  console.log("  bun dev                    # Start portagent (default)");
  console.log("  bun dev server             # Start WebSocket server");
  console.log("  bun dev storybook          # Start Storybook");
  console.log("  bun dev storybook server   # Start multiple services");
  console.log("  bun dev all                # Start all dev tools");
  process.exit(0);
}

// Service aliases (user-friendly names -> actual service names)
const ALIASES: Record<string, ServiceName[]> = {
  portagent: ["portagent:server", "portagent:client"],
  all: ["server", "storybook"],
};

// Resolve services to start
let servicesToStart: ServiceName[];

if (args.length === 0) {
  // Default: start portagent (server + client)
  servicesToStart = ALIASES.portagent;
} else {
  const resolved = new Set<ServiceName>();

  for (const arg of args) {
    if (arg in ALIASES) {
      // Expand alias
      ALIASES[arg].forEach((s) => resolved.add(s));
    } else if (Object.keys(SERVICES).includes(arg)) {
      // Direct service name
      resolved.add(arg as ServiceName);
    }
  }

  servicesToStart = Array.from(resolved);
}

if (servicesToStart.length === 0) {
  console.error("❌ No valid services specified");
  console.error('Run "bun dev --help" for usage information');
  process.exit(1);
}

// Start services
const manager = new DevManager();
await manager.start(servicesToStart);
