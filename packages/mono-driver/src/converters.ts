/**
 * Message and Event Converters
 *
 * Converts between AgentX types and Vercel AI SDK v6 types
 */

import type { Message, ToolResultMessage } from "@agentxjs/core/agent";
import type { DriverStreamEvent, StopReason, ToolDefinition } from "@agentxjs/core/driver";
import type { ModelMessage, ToolSet } from "ai";
import { jsonSchema, tool } from "ai";

// ============================================================================
// Message Converters (AgentX → Vercel AI SDK v6)
// ============================================================================

/**
 * Convert AgentX Message to Vercel ModelMessage
 */
export function toVercelMessage(message: Message): ModelMessage | null {
  switch (message.subtype) {
    case "user":
      return {
        role: "user",
        content:
          typeof message.content === "string" ? message.content : extractText(message.content),
      };

    case "assistant": {
      // Assistant message may contain text and tool calls in content
      const content = "content" in message ? message.content : "";
      if (typeof content === "string") {
        return { role: "assistant", content };
      }
      // Extract tool calls from content parts
      const toolCalls = content.filter(
        (p): p is { type: "tool-call"; id: string; name: string; input: Record<string, unknown> } =>
          p.type === "tool-call"
      );
      if (toolCalls.length > 0) {
        // Vercel AI SDK format: assistant with tool-call content
        return {
          role: "assistant",
          content: [
            ...content
              .filter((p) => p.type === "text")
              .map((p) => ({ type: "text" as const, text: (p as { text: string }).text })),
            ...toolCalls.map((tc) => ({
              type: "tool-call" as const,
              toolCallId: tc.id,
              toolName: tc.name,
              input: tc.input,
            })),
          ],
        } as unknown as ModelMessage;
      }
      return { role: "assistant", content: extractText(content) };
    }

    case "tool-result": {
      const msg = message as ToolResultMessage;
      return {
        role: "tool",
        content: [
          {
            type: "tool-result" as const,
            toolCallId: msg.toolCallId,
            toolName: msg.toolResult.name,
            output: msg.toolResult.output,
          },
        ],
      } as unknown as ModelMessage;
    }

    default:
      return null;
  }
}

/**
 * Convert array of AgentX Messages to Vercel ModelMessages
 */
export function toVercelMessages(messages: Message[]): ModelMessage[] {
  const result: ModelMessage[] = [];
  for (const message of messages) {
    const converted = toVercelMessage(message);
    if (converted) {
      result.push(converted);
    }
  }
  return result;
}

/**
 * Extract text from any content shape
 */
function extractText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .filter(
        (part) =>
          part !== null &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("");
  }

  return String(content ?? "");
}

// ============================================================================
// Event Converters (Vercel AI SDK → AgentX)
// ============================================================================

/**
 * Map Vercel AI SDK v6 finish reason to AgentX StopReason
 */
export function toStopReason(finishReason: string | null | undefined): StopReason {
  switch (finishReason) {
    case "stop":
      return "end_turn";
    case "length":
      return "max_tokens";
    case "tool-calls":
      return "tool_use";
    case "content-filter":
      return "content_filter";
    case "error":
      return "error";
    default:
      return "other";
  }
}

/**
 * Create a DriverStreamEvent with timestamp
 */
export function createEvent<T extends DriverStreamEvent["type"]>(
  type: T,
  data: Extract<DriverStreamEvent, { type: T }>["data"]
): DriverStreamEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
  } as DriverStreamEvent;
}

// ============================================================================
// Tool Converters (AgentX → Vercel AI SDK v6)
// ============================================================================

/**
 * Convert AgentX ToolDefinitions to Vercel AI SDK tool format
 *
 * Uses jsonSchema() instead of Zod to avoid adding Zod dependency to core.
 * Type casts are needed to bridge our ToolDefinition.parameters (simplified
 * JSON Schema) to the AI SDK's strict JSONSchema7 type.
 */
export function toVercelTools(tools: ToolDefinition[]): ToolSet {
  const result: ToolSet = {};
  for (const t of tools) {
    result[t.name] = tool({
      description: t.description,

      inputSchema: jsonSchema(t.parameters as any),
      execute: async (input) => t.execute(input as Record<string, unknown>),
    });
  }
  return result;
}
