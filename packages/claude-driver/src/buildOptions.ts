/**
 * Build Claude SDK Options from Driver Config
 *
 * Converts driver configuration to Claude SDK Options format.
 */

import type { Options, McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { createLogger } from "@agentxjs/core/common";

const logger = createLogger("claude-driver/buildOptions");

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

  // Set Claude Code executable path if provided
  if (context.claudeCodePath) {
    options.pathToClaudeCodeExecutable = context.claudeCodePath;
    logger.info("Claude Code path configured", { path: context.claudeCodePath });
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
