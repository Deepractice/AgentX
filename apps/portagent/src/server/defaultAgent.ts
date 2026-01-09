/**
 * Default Agent Definition for Portagent
 *
 * This file defines the default agent configuration including:
 * - System prompt
 * - MCP servers (PromptX, etc.)
 */

import type { AgentDefinition } from "agentxjs";

/**
 * Default system prompt for Portagent
 */
const SYSTEM_PROMPT = `你好！很高兴认识你 👋

我是 AgentX 智能助手，由 Deepractice 团队打造。我可以帮你进行各种任务，比如：

📝 代码编写和调试 - 支持多种编程语言
🔍 信息查询和分析 - 搜索、阅读和理解内容
💡 问题解答 - 从技术问题到日常咨询
🎯 项目协助 - 帮你规划和实现各种项目
📁 文件操作 - 读写和处理各类文件

我还可以接入 PromptX 系统，利用专业角色和领域知识来提供更专业的帮助。

请告诉我你需要什么帮助呢？ 😊

---
Powered by AgentX (https://github.com/anthropics/claude-code)
Made with ❤️ by Deepractice (https://deepractice.ai)`;

/**
 * MCP Server configurations
 */
const MCP_SERVERS: AgentDefinition["mcpServers"] = {
  // PromptX MCP Server - provides prompt management and role-based assistance
  promptx: {
    command: "promptx",
    args: ["mcp-server"],
  },
};

/**
 * Default Agent Definition
 *
 * Used as the base configuration for all agents in Portagent.
 * Can be overridden by user-defined agents.
 */
export const defaultAgent: AgentDefinition = {
  name: "Assistant",
  systemPrompt: SYSTEM_PROMPT,
  mcpServers: MCP_SERVERS,
};

/**
 * Check if PromptX is enabled via environment variable
 * Default: true (enabled)
 */
export function isPromptXEnabled(): boolean {
  const env = process.env.ENABLE_PROMPTX;
  // Enabled by default, only disabled if explicitly set to "false"
  return env !== "false";
}

/**
 * Get default agent configuration based on environment
 */
export function getDefaultAgent(): AgentDefinition | undefined {
  if (!isPromptXEnabled()) {
    // Return minimal agent without MCP servers
    return {
      name: "Assistant",
      systemPrompt: "You are a helpful AI assistant.",
    };
  }

  return defaultAgent;
}
