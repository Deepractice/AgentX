/**
 * Build Claude SDK Options from Driver Config
 *
 * Converts driver configuration to Claude SDK Options format.
 */

import { createRequire } from "node:module";
import type { McpServerConfig, Options } from "@anthropic-ai/claude-agent-sdk";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("claude-driver/buildOptions");

/**
 * Get the default Claude Code CLI path from the installed package
 *
 * Resolves the path to `@anthropic-ai/claude-code/cli.js` using Node.js module resolution.
 * This allows zero-config deployment when claude-code is installed as a dependency.
 *
 * @returns The resolved path to cli.js, or undefined if resolution fails
 */
function getDefaultClaudeCodePath(): string | undefined {
  try {
    const require = createRequire(import.meta.url);
    const cliPath = require.resolve("@anthropic-ai/claude-code/cli.js");
    logger.debug("Resolved default Claude Code path", { path: cliPath });
    return cliPath;
  } catch (error) {
    logger.warn("Failed to resolve @anthropic-ai/claude-code/cli.js", { error });
    return undefined;
  }
}

/**
 * Environment context for Claude SDK
 */
export interface EnvironmentContext {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan";
  resume?: string;
  maxTurns?: number;
  maxThinkingTokens?: number;
  mcpServers?: Record<string, McpServerConfig>;
  claudeCodePath?: string;
}

/**
 * Build Claude SDK options from environment context
 */
export function buildOptions(
  context: EnvironmentContext,
  abortController: AbortController
): Options {
  const options: Options = {
    abortController,
    includePartialMessages: true,
  };

  // Working directory
  if (context.cwd) {
    options.cwd = context.cwd;
  }

  // Environment variables - must include PATH for subprocess to find node
  const env: Record<string, string> = {};
  // Copy all process.env values, filtering out undefined
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  // Ensure PATH is set (critical for subprocess to find node)
  if (!env.PATH && process.env.PATH) {
    env.PATH = process.env.PATH;
  }

  // Mark process as AgentX environment for identification and debugging
  env.AGENTX_ENVIRONMENT = "true";

  if (context.baseUrl) {
    env.ANTHROPIC_BASE_URL = context.baseUrl;
  }
  if (context.apiKey) {
    env.ANTHROPIC_API_KEY = context.apiKey;
  }
  options.env = env;

  logger.info("buildOptions called", {
    hasPath: !!env.PATH,
    pathLength: env.PATH?.length,
    hasApiKey: !!env.ANTHROPIC_API_KEY,
    hasBaseUrl: !!env.ANTHROPIC_BASE_URL,
    baseUrl: env.ANTHROPIC_BASE_URL,
    model: context.model,
    permissionMode: context.permissionMode || "bypassPermissions",
    cwd: context.cwd,
    systemPrompt: context.systemPrompt,
    mcpServers: context.mcpServers ? Object.keys(context.mcpServers) : [],
  });

  // Capture stderr from SDK subprocess for debugging
  options.stderr = (data: string) => {
    logger.info("SDK stderr", { data: data.trim() });
  };

  // Set Claude Code executable path
  // Priority: user-provided path > auto-resolved from installed package
  const claudeCodePath = context.claudeCodePath || getDefaultClaudeCodePath();
  if (claudeCodePath) {
    options.pathToClaudeCodeExecutable = claudeCodePath;
    logger.info("Claude Code path configured", {
      path: claudeCodePath,
      source: context.claudeCodePath ? "user-provided" : "auto-resolved",
    });
  }

  // Model configuration
  if (context.model) options.model = context.model;
  if (context.systemPrompt) options.systemPrompt = context.systemPrompt;
  if (context.maxTurns) options.maxTurns = context.maxTurns;
  if (context.maxThinkingTokens) options.maxThinkingTokens = context.maxThinkingTokens;

  // Session control
  if (context.resume) options.resume = context.resume;

  // MCP servers
  if (context.mcpServers) {
    options.mcpServers = context.mcpServers;
    logger.info("MCP servers configured", {
      serverNames: Object.keys(context.mcpServers),
    });
  }

  // Permission system
  if (context.permissionMode) {
    options.permissionMode = context.permissionMode;
    // Required when using bypassPermissions mode
    if (context.permissionMode === "bypassPermissions") {
      options.allowDangerouslySkipPermissions = true;
    }
  } else {
    // Default to bypass permissions (agent runs autonomously)
    options.permissionMode = "bypassPermissions";
    options.allowDangerouslySkipPermissions = true;
  }

  logger.info("SDK Options built", {
    model: options.model,
    systemPrompt: options.systemPrompt,
    permissionMode: options.permissionMode,
    cwd: options.cwd,
    resume: options.resume,
    maxTurns: options.maxTurns,
    mcpServers: options.mcpServers ? Object.keys(options.mcpServers) : [],
  });

  return options;
}
