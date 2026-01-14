#!/usr/bin/env bun
/**
 * BDD Test Manager
 *
 * Unified entry point for running BDD tests.
 *
 * Usage:
 *   bun test:bdd              # Run all tests (start server + run cucumber)
 *   bun test:bdd server       # Start test server only
 *   bun test:bdd run          # Run cucumber only (assumes server is running)
 *   bun test:bdd --tags @local  # Run with cucumber tags
 */

import { spawn } from "bun";
import { join } from "path";
import { getModuleDir } from "@agentxjs/common/path";

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const TEST_SERVER_PORT = 15300;

class TestManager {
  private serverProcess?: any;

  async startServer() {
    console.log(`${CYAN}[Test Server]${RESET} Starting on port ${TEST_SERVER_PORT}...\n`);

    const moduleDir = getModuleDir(import.meta);
    this.serverProcess = spawn({
      cmd: ["bun", "--bun", "bdd/test-server.ts"],
      cwd: join(moduleDir, ".."),
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });

    // Stream output
    this.streamOutput("Test Server", this.serverProcess, CYAN);

    // Wait for server to be ready
    await this.waitForServer();
  }

  private async waitForServer() {
    console.log(`${CYAN}[Test Server]${RESET} Waiting for server to be ready...`);
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const ws = new WebSocket(`ws://localhost:${TEST_SERVER_PORT}`);
        await new Promise<void>((resolve, reject) => {
          ws.onopen = () => {
            ws.close();
            resolve();
          };
          ws.onerror = reject;
          setTimeout(() => reject(new Error("timeout")), 1000);
        });
        console.log(`${GREEN}[Test Server]${RESET} Server ready!\n`);
        return;
      } catch {
        // Still not ready
      }

      attempts++;
      await new Promise((r) => setTimeout(r, 300));
    }

    throw new Error("Test server failed to start");
  }

  async runCucumber(extraArgs: string[] = []) {
    console.log(`${GREEN}[Cucumber]${RESET} Running tests...\n`);

    // Check if user is running @integration tests - if so, use integration config
    const tagsArg = extraArgs.find(
      (arg, i) => extraArgs[i - 1] === "--tags" || arg.startsWith("--tags=")
    );
    const tagsValue = tagsArg?.startsWith("--tags=")
      ? tagsArg.split("=")[1]
      : extraArgs[extraArgs.indexOf("--tags") + 1];

    const isIntegrationTest =
      tagsValue &&
      (tagsValue.includes("@integration") ||
        tagsValue.includes("@capture-events") ||
        tagsValue.includes("@disconnect-recovery") ||
        tagsValue.includes("@real-api"));

    // Build final args
    const args = ["--bun", "../node_modules/.bin/cucumber-js"];

    if (isIntegrationTest) {
      // Use integration config for integration tests
      args.push("--config", "cucumber.integration.js");
    }

    args.push(...extraArgs);

    const moduleDir = getModuleDir(import.meta);
    const proc = spawn({
      cmd: ["bun", ...args],
      cwd: moduleDir,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "inherit",
      env: {
        ...process.env,
        TEST_SERVER_URL: `ws://localhost:${TEST_SERVER_PORT}`,
      },
    });

    this.streamOutput("Cucumber", proc, GREEN);

    const exitCode = await proc.exited;
    return exitCode;
  }

  private streamOutput(name: string, proc: any, color: string) {
    if (proc.stdout) {
      (async () => {
        for await (const chunk of proc.stdout) {
          const lines = new TextDecoder().decode(chunk).split("\n");
          for (const line of lines) {
            if (line.trim()) {
              console.log(`${color}[${name}]${RESET} ${line}`);
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
              console.error(`${color}[${name}]${RESET} ${line}`);
            }
          }
        }
      })();
    }
  }

  async shutdown() {
    if (this.serverProcess) {
      console.log(`\n${YELLOW}[Manager]${RESET} Stopping test server...`);

      // Send SIGTERM for graceful shutdown
      this.serverProcess.kill("SIGTERM");

      // Wait for exit with timeout
      const exitPromise = this.serverProcess.exited;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("shutdown timeout")), 5000)
      );

      try {
        await Promise.race([exitPromise, timeoutPromise]);
        console.log(`${YELLOW}[Manager]${RESET} Test server stopped gracefully`);
      } catch {
        // Force kill if timeout
        console.log(`${YELLOW}[Manager]${RESET} Force killing test server...`);
        this.serverProcess.kill("SIGKILL");
        await this.serverProcess.exited;
      }

      this.serverProcess = undefined;
    }
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);

// Show help
if (args.includes("--help") || args.includes("-h")) {
  console.log("BDD Test Manager - Unified test runner\n");
  console.log("Usage:");
  console.log("  bun test:bdd [command] [options]\n");
  console.log("Commands:");
  console.log("  (default)   - Run all tests (start server + run cucumber)");
  console.log("  server      - Start test server only");
  console.log("  run         - Run cucumber only (assumes server running)\n");
  console.log("Cucumber options:");
  console.log("  --tags @local        - Run only @local tests");
  console.log("  --tags @reliability  - Run only @reliability tests");
  console.log('  --tags "not @slow"   - Exclude @slow tests\n');
  console.log("Examples:");
  console.log("  bun test:bdd                    # Run all tests");
  console.log("  bun test:bdd server             # Start server only");
  console.log("  bun test:bdd run                # Run tests only");
  console.log("  bun test:bdd --tags @local      # Run local tests only");
  process.exit(0);
}

const manager = new TestManager();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await manager.shutdown();
  process.exit(0);
});

// Determine command
const command = args[0];
const cucumberArgs = command === "run" || command === "server" ? args.slice(1) : args;

// Clean test data before running tests
async function cleanTestData() {
  const { rm } = await import("fs/promises");
  const { resolve } = await import("path");
  const moduleDir = getModuleDir(import.meta);
  const testDataDir = resolve(moduleDir, ".agentx-test");

  try {
    await rm(testDataDir, { recursive: true, force: true });
    console.log(`${YELLOW}[Manager]${RESET} Cleaned test data: ${testDataDir}\n`);
  } catch {
    // Ignore if doesn't exist
  }
}

try {
  if (command === "server") {
    // Start server only
    await cleanTestData();
    await manager.startServer();
    console.log(`${GREEN}[Manager]${RESET} Server running. Press Ctrl+C to stop.\n`);
    await new Promise(() => {}); // Keep alive
  } else if (command === "run") {
    // Run tests only (assumes server is running, don't clean)
    const exitCode = await manager.runCucumber(cucumberArgs);
    process.exit(exitCode);
  } else {
    // Default: Start server + run tests
    await cleanTestData();
    await manager.startServer();
    const exitCode = await manager.runCucumber(cucumberArgs);
    await manager.shutdown();
    process.exit(exitCode);
  }
} catch (error) {
  console.error(`\n${YELLOW}[Manager]${RESET} Error:`, error);
  await manager.shutdown();
  process.exit(1);
}
