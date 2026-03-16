/**
 * Performance Test: With vs Without Context (RoleX)
 *
 * Measures time breakdown of driver.receive() to identify
 * where RoleX context adds latency.
 */

import { describe, expect, test } from "bun:test";
import type { UserContentPart } from "@agentxjs/core/agent";
import { createMonoDriver } from "../src/MonoDriver";

const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";
const model = "doubao-seed-2.0-lite";

async function measureReply(driver: ReturnType<typeof createMonoDriver>, content: string) {
  const message = {
    id: `msg_${Date.now()}`,
    role: "user" as const,
    subtype: "user" as const,
    content,
    timestamp: Date.now(),
  };

  const t0 = performance.now();
  let firstTokenTime = 0;
  let tokenCount = 0;
  const texts: string[] = [];

  for await (const event of driver.receive(message)) {
    if (event.type === "text_delta") {
      if (!firstTokenTime) firstTokenTime = performance.now();
      tokenCount++;
      texts.push((event.data as { text: string }).text);
    }
  }

  const totalTime = performance.now() - t0;
  const ttft = firstTokenTime ? firstTokenTime - t0 : totalTime;

  return {
    ttft: Math.round(ttft),
    total: Math.round(totalTime),
    tokens: tokenCount,
    reply: texts.join("").slice(0, 80),
  };
}

describe("Performance: Context Impact", () => {
  test("baseline: no context, no tools, no system prompt", async () => {
    const driver = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf-baseline",
    });
    await driver.initialize();

    const r1 = await measureReply(driver, "Say hello in one word.");
    const r2 = await measureReply(driver, "Say goodbye in one word.");
    const r3 = await measureReply(driver, "What is 1+1? Reply with just the number.");

    console.log("\n=== Baseline (no context) ===");
    console.log(
      `  Run 1: TTFT=${r1.ttft}ms, Total=${r1.total}ms, Tokens=${r1.tokens}, Reply: ${r1.reply}`
    );
    console.log(
      `  Run 2: TTFT=${r2.ttft}ms, Total=${r2.total}ms, Tokens=${r2.tokens}, Reply: ${r2.reply}`
    );
    console.log(
      `  Run 3: TTFT=${r3.ttft}ms, Total=${r3.total}ms, Tokens=${r3.tokens}, Reply: ${r3.reply}`
    );
    console.log(`  Avg TTFT: ${Math.round((r1.ttft + r2.ttft + r3.ttft) / 3)}ms`);
    console.log(`  Avg Total: ${Math.round((r1.total + r2.total + r3.total) / 3)}ms`);

    expect(r1.tokens).toBeGreaterThan(0);
    await driver.dispose();
  }, 60000);

  test("with system prompt only", async () => {
    const driver = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf-sysprompt",
      systemPrompt: "You are a helpful assistant. Reply briefly in one sentence.",
    });
    await driver.initialize();

    const r1 = await measureReply(driver, "Say hello in one word.");
    const r2 = await measureReply(driver, "Say goodbye in one word.");
    const r3 = await measureReply(driver, "What is 1+1? Reply with just the number.");

    console.log("\n=== With System Prompt ===");
    console.log(
      `  Run 1: TTFT=${r1.ttft}ms, Total=${r1.total}ms, Tokens=${r1.tokens}, Reply: ${r1.reply}`
    );
    console.log(
      `  Run 2: TTFT=${r2.ttft}ms, Total=${r2.total}ms, Tokens=${r2.tokens}, Reply: ${r2.reply}`
    );
    console.log(
      `  Run 3: TTFT=${r3.ttft}ms, Total=${r3.total}ms, Tokens=${r3.tokens}, Reply: ${r3.reply}`
    );
    console.log(`  Avg TTFT: ${Math.round((r1.ttft + r2.ttft + r3.ttft) / 3)}ms`);
    console.log(`  Avg Total: ${Math.round((r1.total + r2.total + r3.total) / 3)}ms`);

    expect(r1.tokens).toBeGreaterThan(0);
    await driver.dispose();
  }, 60000);

  test("with system prompt + mock context (simulating RoleX schema + projection)", async () => {
    // Simulate RoleX context size — schema (~2KB) + projection (~1KB)
    const mockSchema = `<instructions>
You are operating within the RoleX cognitive framework.

## Role Protocol
- Each role has identity, goals, plans, and knowledge
- Respond in character at all times
- Use the provided tools to manage role state

## Available Operations
- activate: Switch to a different role
- inspect: View detailed state of a node
- survey: List all roles and their status
- direct: Execute a direct command on a role

## Cognitive Guidelines
1. Always consider the role's goals before responding
2. Reference the role's knowledge when relevant
3. Update plans as goals are achieved
4. Maintain consistency with the role's identity
</instructions>`;

    const mockProjection = `<context>
## Current Role: Software Architect
- Identity: Senior software architect with 15 years of experience
- Goal: Design scalable microservice architectures
- Current Plan: Review the authentication service design
- Knowledge: Familiar with DDD, event sourcing, CQRS patterns
- Status: Active

## Society Overview
- 3 active roles: Software Architect, Code Reviewer, DevOps Engineer
- 2 past roles: Project Manager, QA Lead
</context>`;

    const driver = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf-context",
      systemPrompt: `${mockSchema}\n\n${mockProjection}`,
    });
    await driver.initialize();

    const r1 = await measureReply(driver, "Say hello in one word.");
    const r2 = await measureReply(driver, "Say goodbye in one word.");
    const r3 = await measureReply(driver, "What is 1+1? Reply with just the number.");

    console.log("\n=== With Mock Context (schema + projection ~3KB) ===");
    console.log(
      `  Run 1: TTFT=${r1.ttft}ms, Total=${r1.total}ms, Tokens=${r1.tokens}, Reply: ${r1.reply}`
    );
    console.log(
      `  Run 2: TTFT=${r2.ttft}ms, Total=${r2.total}ms, Tokens=${r2.tokens}, Reply: ${r2.reply}`
    );
    console.log(
      `  Run 3: TTFT=${r3.ttft}ms, Total=${r3.total}ms, Tokens=${r3.tokens}, Reply: ${r3.reply}`
    );
    console.log(`  Avg TTFT: ${Math.round((r1.ttft + r2.ttft + r3.ttft) / 3)}ms`);
    console.log(`  Avg Total: ${Math.round((r1.total + r2.total + r3.total) / 3)}ms`);

    expect(r1.tokens).toBeGreaterThan(0);
    await driver.dispose();
  }, 60000);

  test("with system prompt + tools (simulating RoleX tool injection)", async () => {
    // Simulate RoleX tools — typically 5-8 tools
    const tools = [
      {
        name: "activate",
        description: "Activate a role by ID",
        parameters: {
          type: "object" as const,
          properties: { roleId: { type: "string", description: "Role ID to activate" } },
          required: ["roleId"],
        },
        execute: async () => "ok",
      },
      {
        name: "inspect",
        description: "Inspect a node's state",
        parameters: {
          type: "object" as const,
          properties: { id: { type: "string", description: "Node ID" } },
          required: ["id"],
        },
        execute: async () => "ok",
      },
      {
        name: "survey",
        description: "List all roles",
        parameters: {
          type: "object" as const,
          properties: { type: { type: "string", description: "Filter type" } },
        },
        execute: async () => "ok",
      },
      {
        name: "direct",
        description: "Execute a direct command",
        parameters: {
          type: "object" as const,
          properties: { command: { type: "string" }, args: { type: "object" } },
          required: ["command"],
        },
        execute: async () => "ok",
      },
      {
        name: "set_goal",
        description: "Set a goal for the current role",
        parameters: {
          type: "object" as const,
          properties: { goal: { type: "string" } },
          required: ["goal"],
        },
        execute: async () => "ok",
      },
      {
        name: "add_knowledge",
        description: "Add knowledge to the role",
        parameters: {
          type: "object" as const,
          properties: { content: { type: "string" } },
          required: ["content"],
        },
        execute: async () => "ok",
      },
    ];

    const driver = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf-tools",
      systemPrompt: "You are a helpful assistant. Reply briefly.",
      tools,
    });
    await driver.initialize();

    const r1 = await measureReply(driver, "Say hello in one word.");
    const r2 = await measureReply(driver, "Say goodbye in one word.");
    const r3 = await measureReply(driver, "What is 1+1? Reply with just the number.");

    console.log("\n=== With 6 Tools (no context) ===");
    console.log(
      `  Run 1: TTFT=${r1.ttft}ms, Total=${r1.total}ms, Tokens=${r1.tokens}, Reply: ${r1.reply}`
    );
    console.log(
      `  Run 2: TTFT=${r2.ttft}ms, Total=${r2.total}ms, Tokens=${r2.tokens}, Reply: ${r2.reply}`
    );
    console.log(
      `  Run 3: TTFT=${r3.ttft}ms, Total=${r3.total}ms, Tokens=${r3.tokens}, Reply: ${r3.reply}`
    );
    console.log(`  Avg TTFT: ${Math.round((r1.ttft + r2.ttft + r3.ttft) / 3)}ms`);
    console.log(`  Avg Total: ${Math.round((r1.total + r2.total + r3.total) / 3)}ms`);

    expect(r1.tokens).toBeGreaterThan(0);
    await driver.dispose();
  }, 60000);

  test("full simulation: context + tools (like real RoleX)", async () => {
    const mockSchema = `<instructions>
You are operating within the RoleX cognitive framework.
Each role has identity, goals, plans, and knowledge.
Use the provided tools to manage role state.
</instructions>`;

    const mockProjection = `<context>
## Current Role: Software Architect
- Identity: Senior architect
- Goal: Design scalable systems
- Plan: Review auth service
- Knowledge: DDD, event sourcing, CQRS
</context>`;

    const tools = [
      {
        name: "activate",
        description: "Activate a role",
        parameters: {
          type: "object" as const,
          properties: { roleId: { type: "string" } },
          required: ["roleId"],
        },
        execute: async () => "ok",
      },
      {
        name: "inspect",
        description: "Inspect node state",
        parameters: {
          type: "object" as const,
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        execute: async () => "ok",
      },
      {
        name: "survey",
        description: "List roles",
        parameters: { type: "object" as const, properties: { type: { type: "string" } } },
        execute: async () => "ok",
      },
      {
        name: "direct",
        description: "Direct command",
        parameters: {
          type: "object" as const,
          properties: { command: { type: "string" }, args: { type: "object" } },
          required: ["command"],
        },
        execute: async () => "ok",
      },
      {
        name: "set_goal",
        description: "Set goal",
        parameters: {
          type: "object" as const,
          properties: { goal: { type: "string" } },
          required: ["goal"],
        },
        execute: async () => "ok",
      },
      {
        name: "add_knowledge",
        description: "Add knowledge",
        parameters: {
          type: "object" as const,
          properties: { content: { type: "string" } },
          required: ["content"],
        },
        execute: async () => "ok",
      },
    ];

    const driver = createMonoDriver({
      apiKey,
      baseUrl,
      model,
      provider: "anthropic",
      instanceId: "perf-full",
      systemPrompt: `${mockSchema}\n\n${mockProjection}`,
      tools,
    });
    await driver.initialize();

    const r1 = await measureReply(driver, "Say hello in one word.");
    const r2 = await measureReply(driver, "Say goodbye in one word.");
    const r3 = await measureReply(driver, "What is 1+1? Reply with just the number.");

    console.log("\n=== Full RoleX Simulation (context + 6 tools) ===");
    console.log(
      `  Run 1: TTFT=${r1.ttft}ms, Total=${r1.total}ms, Tokens=${r1.tokens}, Reply: ${r1.reply}`
    );
    console.log(
      `  Run 2: TTFT=${r2.ttft}ms, Total=${r2.total}ms, Tokens=${r2.tokens}, Reply: ${r2.reply}`
    );
    console.log(
      `  Run 3: TTFT=${r3.ttft}ms, Total=${r3.total}ms, Tokens=${r3.tokens}, Reply: ${r3.reply}`
    );
    console.log(`  Avg TTFT: ${Math.round((r1.ttft + r2.ttft + r3.ttft) / 3)}ms`);
    console.log(`  Avg Total: ${Math.round((r1.total + r2.total + r3.total) / 3)}ms`);

    expect(r1.tokens).toBeGreaterThan(0);
    await driver.dispose();
  }, 60000);
});
