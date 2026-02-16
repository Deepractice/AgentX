/**
 * NodeBashProvider - Node.js implementation of BashProvider
 *
 * Uses execa for subprocess execution with proper timeout,
 * error handling, and cross-platform shell support.
 */

import type { BashOptions, BashProvider, BashResult } from "@agentxjs/core/bash";
import { createLogger } from "commonxjs/logger";
import { execa } from "execa";

const logger = createLogger("node-platform/NodeBashProvider");

/**
 * Default timeout: 30 seconds
 */
const DEFAULT_TIMEOUT = 30_000;

/**
 * NodeBashProvider - Executes shell commands via execa
 */
export class NodeBashProvider implements BashProvider {
  readonly type = "child-process";

  async execute(command: string, options?: BashOptions): Promise<BashResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    logger.debug("Executing command", {
      command: command.substring(0, 100),
      cwd: options?.cwd,
      timeout,
    });

    const result = await execa({
      shell: true,
      cwd: options?.cwd,
      timeout,
      env: options?.env ? { ...process.env, ...options.env } : undefined,
      reject: false,
    })`${command}`;

    logger.debug("Command completed", {
      exitCode: result.exitCode,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 1,
    };
  }
}
