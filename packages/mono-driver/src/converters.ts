/**
 * Message and Event Converters
 *
 * Converts between AgentX types and Vercel AI SDK v6 types
 */

import { tool, jsonSchema } from "ai";
import type { ModelMessage, ToolSet } from "ai";
import type { Message } from "@agentxjs/core/agent";
import type { DriverStreamEvent, StopReason, ToolDefinition } from "@agentxjs/core/driver";

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
        content: typeof message.content === "string"
          ? message.content
          : extractText(message.content),
      };

    case "assistant":
      return {
        role: "assistant",
        content: extractText(
          "content" in message ? message.content : ""
        ),
      };

    case "tool-call":
      // Tool calls are embedded in assistant messages in Vercel AI SDK
      return null;

    case "tool-result": {
      const msg = message as unknown as { toolCallId: string; toolResult: { result: unknown } };
      return {
        role: "tool",
        content: [
          {
            type: "tool-result" as const,
            toolCallId: msg.toolCallId,
            toolName: "unknown",
            output: msg.toolResult.result,
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
export function toStopReason(
  finishReason: string | null | undefined
): StopReason {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: jsonSchema(t.parameters as any),
      execute: async (input) => t.execute(input as Record<string, unknown>),
    });
  }
  return result;
}
