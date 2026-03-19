/**
 * Tool Call End-to-End Round-Trip Test
 *
 * Uses REAL MonoDriver + Runtime + SQLite persistence.
 * Sends a message that triggers a tool call, then restores
 * from persistence and verifies tool calls survive.
 *
 * Requires ANTHROPIC_API_KEY or DEEPRACTICE_API_KEY in .env.local
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentContext } from "@agentxjs/core/driver";
import { EventBusImpl } from "@agentxjs/core/event";
import { createAgentXRuntime } from "@agentxjs/core/runtime";
import { createMonoDriver } from "@agentxjs/mono-driver";
import { createPersistence, sqliteDriver } from "@agentxjs/node-platform/persistence";
import { messagesToConversations } from "../reducer";
import type { AssistantConversation, ToolBlock } from "../types";

let tempDir: string;
let persistence: Awaited<ReturnType<typeof createPersistence>>;

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.DEEPRACTICE_API_KEY;
const baseUrl = process.env.DEEPRACTICE_BASE_URL;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agentx-tool-e2e-"));
  persistence = await createPersistence(sqliteDriver({ path: join(tempDir, "test.db") }));
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Tool call E2E round-trip", () => {
  test("tool call survives persist → restore", async () => {
    if (!apiKey) {
      console.log("Skipping: no API key");
      return;
    }

    // Create runtime with a simple bash tool
    const createDriver = (config: AgentContext) =>
      createMonoDriver({
        ...config,
        apiKey: apiKey!,
        baseUrl,
        model: process.env.DEEPRACTICE_MODEL || "claude-sonnet-4-20250514",
        provider: "anthropic",
        maxSteps: 5,
      });

    const eventBus = new EventBusImpl();
    const runtime = createAgentXRuntime(
      {
        containerId: "default",
        containerRepository: persistence.containers,
        imageRepository: persistence.images,
        sessionRepository: persistence.sessions,
        eventBus,
      },
      createDriver
    );

    // Create image
    const { createImage } = await import("@agentxjs/core/image");
    const image = await createImage(
      {
        containerId: "default",
        name: "Tool Test Agent",
        systemPrompt:
          "You have a bash tool. When asked to run a command, use the bash tool. Be brief.",
      },
      {
        imageRepository: persistence.images,
        sessionRepository: persistence.sessions,
      }
    );

    const imageId = image.toRecord().imageId;
    const sessionId = image.toRecord().sessionId;

    // Create agent and send a message that should trigger tool use
    const agent = await runtime.createAgent({ imageId });

    // Debug: track ALL events
    const allEvents: string[] = [];
    eventBus.onAny((event: any) => {
      allEvents.push(event.type);
      if (event.type === "assistant_message") {
        const content = event.data?.content;
        const hasToolCall =
          Array.isArray(content) && content.some((p: any) => p.type === "tool-call");
        console.log(
          `  [EVENT] assistant_message: hasToolCall=${hasToolCall}, content=${JSON.stringify(content).substring(0, 80)}`
        );
      }
    });

    // Wait for response completion
    const responsePromise = new Promise<void>((resolve) => {
      eventBus.onAny((event: any) => {
        if (event.type === "message_stop" && event.data?.stopReason === "end_turn") {
          setTimeout(resolve, 500);
        }
      });
    });

    // Send message that triggers bash tool
    await runtime.receive(
      agent.instanceId,
      'Run the command "echo hello world" using the bash tool.'
    );

    // Wait for completion
    await responsePromise;

    // Debug: show event sequence
    console.log("\n=== Event sequence ===");
    console.log(`  ${allEvents.join(" → ")}`);

    // === Phase 1: Check persisted messages ===
    const messages = await persistence.sessions.getMessages(sessionId);

    console.log("\n=== Persisted messages ===");
    for (const msg of messages) {
      const content = (msg as any).content ?? (msg as any).toolResult;
      const preview =
        typeof content === "string"
          ? content.substring(0, 80)
          : JSON.stringify(content).substring(0, 120);
      console.log(`  ${msg.subtype}: ${preview}`);
    }

    // Should have: user + assistant(tool-call) + tool-result + assistant(text)
    const assistantMsgs = messages.filter((m) => m.subtype === "assistant");
    const toolResultMsgs = messages.filter((m) => m.subtype === "tool-result");

    console.log(
      `\n  Total: ${messages.length} messages (${assistantMsgs.length} assistant, ${toolResultMsgs.length} tool-result)`
    );

    // Verify assistant message has tool-call content parts
    const assistantWithToolCall = assistantMsgs.find((m: any) => {
      const content = m.content;
      if (Array.isArray(content)) {
        return content.some((p: { type: string }) => p.type === "tool-call");
      }
      return false;
    });

    console.log(
      `  Assistant with tool-call: ${assistantWithToolCall ? "YES" : "NO - BUG IN PERSISTENCE"}`
    );

    // === Phase 2: Restore from persistence (simulate page refresh) ===
    const conversations = messagesToConversations(messages);

    console.log("\n=== Restored conversations ===");
    for (const conv of conversations) {
      if (conv.role !== "error") {
        const blocks = (conv as any).blocks;
        console.log(
          `  ${conv.role}: [${blocks.map((b: any) => `${b.type}${b.type === "tool" ? `(${b.toolName})` : ""}`).join(", ")}]`
        );
      }
    }

    // Find tool blocks
    const assistantConvs = conversations.filter(
      (c) => c.role === "assistant"
    ) as AssistantConversation[];
    const allBlocks = assistantConvs.flatMap((c) => c.blocks);
    const toolBlocks = allBlocks.filter((b) => b.type === "tool") as ToolBlock[];

    console.log(`\n  Tool blocks after restore: ${toolBlocks.length}`);
    for (const tb of toolBlocks) {
      console.log(
        `    ${tb.toolName}: status=${tb.status}, result=${tb.toolResult?.substring(0, 50)}`
      );
    }

    // THE CRITICAL ASSERTION
    expect(toolBlocks.length).toBeGreaterThanOrEqual(1);
    expect(toolBlocks[0].status).toBe("completed");
    expect(toolBlocks[0].toolResult).toBeDefined();

    // Cleanup
    await runtime.destroyAgent(agent.instanceId);
    await runtime.shutdown();
  }, 60_000);
});
