/**
 * Performance Test: Real RoleX Context + Multiple Models
 *
 * Tests end-to-end latency with actual RoleX context provider.
 * Breaks down: context.project() time, TTFT, total time.
 */

import { describe, expect, test } from "bun:test";
import { createMonoDriver } from "../src/MonoDriver";

// Ark API
const apiKey = "2511410b-bd2f-44d4-bfc7-5fb7799ba751";
const baseUrl = "https://ark.cn-beijing.volces.com/api/coding";

// Models to test
const models = [
  "doubao-seed-2.0-lite",
  "doubao-seed-2.0-pro",
  "doubao-seed-2.0-code",
  "kimi-k2.5",
  "deepseek-v3.2",
  "glm-4.7",
  "minimax-m2.5",
];

const question = "Say hello in one word.";

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
    reply: texts.join("").slice(0, 50),
  };
}

// ============================================================================
// Layer 1: RoleX context.project() timing
// ============================================================================

describe("Layer 1: RoleX Context Performance", () => {
  test("measure context.project() and schema load time", async () => {
    const { localPlatform } = await import("@rolexjs/local-platform");
    const { RolexContextProvider } = await import("@rolexjs/agentx-context");

    const home = process.env.HOME || "~";
    const rolexPlatform = localPlatform({ dataDir: `${home}/.deepractice/rolex` });
    const provider = new RolexContextProvider(rolexPlatform);

    // List available individuals
    const { createRoleX } = await import("rolexjs");
    const rx = createRoleX({ platform: rolexPlatform });
    const individuals = await rx.survey({ type: "individual", raw: true });
    const roles = Array.isArray(individuals)
      ? individuals.filter((r: any) => r.id && r.id !== "undefined")
      : [];

    console.log(`\n=== RoleX Context Performance ===`);
    console.log(`Available roles: ${roles.map((r: any) => r.alias?.[0] || r.id).join(", ")}`);

    if (roles.length === 0) {
      console.log("No roles found, skipping context test");
      return;
    }

    const roleId = roles[0].id;
    console.log(`Testing with role: ${roleId}`);

    // Measure context creation
    const t0 = performance.now();
    const context = await provider.create(roleId);
    const createTime = Math.round(performance.now() - t0);

    // Measure schema access
    const t1 = performance.now();
    const schema = context.schema;
    const schemaTime = Math.round(performance.now() - t1);

    // Measure project() - 3 runs
    const projectTimes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const tp = performance.now();
      const projection = await context.project();
      projectTimes.push(Math.round(performance.now() - tp));
    }

    // Measure capabilities()
    const tc = performance.now();
    const caps = context.capabilities();
    const capsTime = Math.round(performance.now() - tc);

    console.log(`  Context create: ${createTime}ms`);
    console.log(`  Schema access:  ${schemaTime}ms (${schema.length} chars)`);
    console.log(`  project() x3:   ${projectTimes.join("ms, ")}ms`);
    console.log(`  capabilities(): ${capsTime}ms (${caps.length} tools)`);
    console.log(
      `  Avg project():  ${Math.round(projectTimes.reduce((a, b) => a + b) / projectTimes.length)}ms`
    );

    expect(schema.length).toBeGreaterThan(0);
  }, 30000);
});

// ============================================================================
// Layer 2: Model comparison — baseline (no context)
// ============================================================================

describe("Layer 2: Model Baseline (no context)", () => {
  for (const model of models) {
    test(`${model} — baseline`, async () => {
      const driver = createMonoDriver({
        apiKey,
        baseUrl,
        model,
        provider: "anthropic",
        instanceId: "perf",
      });
      await driver.initialize();

      const r1 = await measureReply(driver, question);
      const r2 = await measureReply(driver, question);

      console.log(
        `[${model}] Baseline: TTFT=${r1.ttft}/${r2.ttft}ms, Total=${r1.total}/${r2.total}ms`
      );
      expect(r1.tokens).toBeGreaterThan(0);
      await driver.dispose();
    }, 60000);
  }
});

// ============================================================================
// Layer 3: Model comparison — with real RoleX context
// ============================================================================

describe("Layer 3: Model + Real RoleX Context", () => {
  let contextSchema: string;
  let contextProjection: string;
  let contextTools: any[];

  test("setup: load real RoleX context", async () => {
    const { localPlatform } = await import("@rolexjs/local-platform");
    const { RolexContextProvider } = await import("@rolexjs/agentx-context");
    const { createRoleX } = await import("rolexjs");

    const home = process.env.HOME || "~";
    const rolexPlatform = localPlatform({ dataDir: `${home}/.deepractice/rolex` });
    const provider = new RolexContextProvider(rolexPlatform);
    const rx = createRoleX({ platform: rolexPlatform });

    const individuals = await rx.survey({ type: "individual", raw: true });
    const roles = Array.isArray(individuals)
      ? individuals.filter((r: any) => r.id && r.id !== "undefined")
      : [];

    if (roles.length === 0) {
      console.log("No roles found, using mock context");
      contextSchema = "You are a helpful assistant.";
      contextProjection = "";
      contextTools = [];
      return;
    }

    const roleId = roles[0].id;
    const context = await provider.create(roleId);
    contextSchema = context.schema;
    contextProjection = await context.project();
    contextTools = context.capabilities().map((cap) => ({
      name: cap.name,
      description: cap.description,
      parameters: cap.parameters,
      execute: cap.execute,
    }));

    console.log(`\n=== Real RoleX Context Loaded ===`);
    console.log(`  Schema: ${contextSchema.length} chars`);
    console.log(`  Projection: ${contextProjection.length} chars`);
    console.log(`  Tools: ${contextTools.length} (${contextTools.map((t) => t.name).join(", ")})`);

    expect(contextSchema.length).toBeGreaterThan(0);
  }, 30000);

  for (const model of models) {
    test(`${model} — with RoleX context`, async () => {
      const systemPrompt = [
        contextSchema ? `<instructions>\n${contextSchema}\n</instructions>` : "",
        contextProjection ? `<context>\n${contextProjection}\n</context>` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const driver = createMonoDriver({
        apiKey,
        baseUrl,
        model,
        provider: "anthropic",
        instanceId: "perf",
        systemPrompt: systemPrompt || undefined,
        tools: contextTools?.length > 0 ? contextTools : undefined,
      });
      await driver.initialize();

      const r1 = await measureReply(driver, question);
      const r2 = await measureReply(driver, question);

      console.log(
        `[${model}] +RoleX: TTFT=${r1.ttft}/${r2.ttft}ms, Total=${r1.total}/${r2.total}ms`
      );
      expect(r1.tokens).toBeGreaterThan(0);
      await driver.dispose();
    }, 60000);
  }
});
