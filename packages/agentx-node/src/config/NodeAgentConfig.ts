/**
 * Node.js Agent Configuration
 *
 * Configuration for creating an Agent instance in Node.js environment.
 * This SDK connects directly to Claude API.
 */

import type { LLMConfig, McpConfig } from "@deepractice-ai/agentx-api";

export interface NodeAgentConfig extends LLMConfig {
  /**
   * Anthropic API key (required)
   * @example "sk-ant-..."
   */
  apiKey: string;

  /**
   * API base URL (optional)
   * @default "https://api.anthropic.com"
   */
  baseUrl?: string;

  /**
   * System prompt
   * Instructions that define the agent's behavior and capabilities
   */
  systemPrompt?: string;

  /**
   * MCP configuration
   * Configure Model Context Protocol servers for tool access
   */
  mcp?: McpConfig;

  /**
   * Request timeout in milliseconds
   * @default 60000
   */
  timeout?: number;
}
