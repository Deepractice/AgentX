/**
 * Journey Steps - Developer Persona
 *
 * End-to-end workflows for developers using the AgentX SDK.
 * All journeys use VCR recording for reproducible, offline tests.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdirSync } from "node:fs";
import type { BusEvent } from "@agentxjs/core/event";
import { env } from "@agentxjs/devtools";
import { ensureDir, getFixturesPath } from "@agentxjs/devtools/bdd";
import type { DataTable } from "@cucumber/cucumber";
import { After, Given, Then, When } from "@cucumber/cucumber";
import type { AgentXWorld } from "../support/world";

// ============================================================================
// State for developer journey
// ============================================================================

interface DeveloperState {
  containerId?: string;
  imageId?: string;
  agentId?: string;
  sessionId?: string;
  lastReplyText?: string;
  events: BusEvent[];
  unsubscribes: Array<() => void>;
  presentation?: import("agentxjs").Presentation;
}

const KEY = "__developer";

function getState(world: AgentXWorld): DeveloperState {
  if (!(world as any)[KEY]) {
    (world as any)[KEY] = { events: [], unsubscribes: [] };
  }
  return (world as any)[KEY];
}

// ============================================================================
// Phase 1: Setup
// ============================================================================

Given(
  "a local AgentX environment with provider {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, provider: string) {
    const { createAgentX } = await import("agentxjs");
    const { createVcrCreateDriver } = await import("@agentxjs/devtools");
    const { createMonoDriver } = await import("@agentxjs/mono-driver");

    const fixtureName = this.scenarioName;
    const fixturesDir = ensureDir(getFixturesPath("recording/journey"));

    const vcrCreateDriver = createVcrCreateDriver({
      fixturesDir,
      getFixtureName: () => fixtureName,
      apiKey: env.apiKey,
      baseUrl: env.baseUrl,
      model: env.model,
      createRealDriver: createMonoDriver as any,
      onPlayback: (name) => console.log(`[Journey VCR] Playback: ${name}`),
      onRecording: (name) => console.log(`[Journey VCR] Recording: ${name}`),
      onSaved: (name, count) => console.log(`[Journey VCR] Saved: ${name} (${count} events)`),
    });

    this.localAgentX = await createAgentX({
      createDriver: vcrCreateDriver,
      provider: provider as any,
      dataPath: ".tmp",
    });
  }
);

// ============================================================================
// Phase 2: Create agent
// ============================================================================

When("I create a container {string}", async function (this: AgentXWorld, containerId: string) {
  const result = await this.localAgentX!.containers.create(containerId);
  getState(this).containerId = result.containerId;
});

When(
  "I create an image {string} in {string} with prompt {string}",
  async function (this: AgentXWorld, name: string, containerId: string, systemPrompt: string) {
    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      systemPrompt,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When(
  "I create an image {string} in {string} with prompt {string} and mcp servers:",
  async function (
    this: AgentXWorld,
    name: string,
    containerId: string,
    systemPrompt: string,
    table: DataTable
  ) {
    const mcpServers: Record<string, any> = {};
    for (const row of table.hashes()) {
      if (row.url) {
        // HTTP/Streamable HTTP transport
        mcpServers[row.name] = {
          type: "http",
          url: row.url,
        };
      } else {
        // Stdio transport
        const args = row.args ? row.args.split(" ") : undefined;

        // Ensure directories exist for filesystem MCP servers
        if (args) {
          const lastArg = args[args.length - 1];
          if (lastArg?.startsWith("/") && !lastArg.includes(".")) {
            if (!existsSync(lastArg)) {
              mkdirSync(lastArg, { recursive: true });
            }
          }
        }

        mcpServers[row.name] = {
          command: row.command,
          args,
          env: row.env ? JSON.parse(row.env) : undefined,
        };
      }
    }

    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      systemPrompt,
      mcpServers,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When("I run the image as an agent", { timeout: 30000 }, async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.agents.create({
    imageId: state.imageId!,
  });
  state.agentId = result.agentId;
});

// ============================================================================
// Phase 3: Chat
// ============================================================================

When(
  "I send message {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    const state = getState(this);
    state.events = [];

    const unsub = this.localAgentX!.onAny((event) => {
      state.events.push(event);
    });
    state.unsubscribes.push(unsub);

    await this.localAgentX!.sessions.send(state.agentId!, message);
    await new Promise((r) => setTimeout(r, 200));

    // Extract reply text from text_delta events
    const textDeltas = state.events.filter((e) => e.type === "text_delta");
    state.lastReplyText = textDeltas.map((e) => (e.data as any).text).join("");
  }
);

Then("I should receive a non-empty reply", function (this: AgentXWorld) {
  const state = getState(this);
  assert.ok(
    state.lastReplyText && state.lastReplyText.length > 0,
    "Should receive a non-empty reply from the agent"
  );
});

Then("the reply should contain {string}", function (this: AgentXWorld, expected: string) {
  const state = getState(this);
  assert.ok(
    state.lastReplyText?.includes(expected),
    `Reply should contain "${expected}", got: "${state.lastReplyText}"`
  );
});

Then("the reply should contain a Chinese character", function (this: AgentXWorld) {
  const state = getState(this);
  const hasChinese = /[\u4e00-\u9fff]/.test(state.lastReplyText || "");
  assert.ok(hasChinese, `Reply should contain Chinese characters, got: "${state.lastReplyText}"`);
});

// ============================================================================
// Phase: Presentation
// ============================================================================

When(
  "I create a presentation for the agent",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const state = getState(this);
    const presentation = await this.localAgentX!.presentations.create(state.agentId!);
    state.presentation = presentation;
  }
);

Then(
  "the presentation state should have {int} conversations",
  function (this: AgentXWorld, count: number) {
    const state = getState(this);
    const ps = state.presentation!.getState();
    assert.equal(
      ps.conversations.length,
      count,
      `Expected ${count} conversations, got ${ps.conversations.length}`
    );
  }
);

Then(
  "the presentation state should have at least {int} conversation(s)",
  function (this: AgentXWorld, minCount: number) {
    const state = getState(this);
    const ps = state.presentation!.getState();
    assert.ok(
      ps.conversations.length >= minCount,
      `Expected at least ${minCount} conversations, got ${ps.conversations.length}`
    );
  }
);

Then(
  "conversation {int} should be a user message containing {string}",
  function (this: AgentXWorld, index: number, expected: string) {
    const state = getState(this);
    const ps = state.presentation!.getState();
    const conv = ps.conversations[index - 1];
    assert.ok(conv, `Conversation ${index} does not exist`);
    assert.equal(conv.role, "user", `Conversation ${index} should be a user message`);
    if (conv.role === "user") {
      const text = conv.blocks
        .filter((b): b is { type: "text"; content: string } => b.type === "text")
        .map((b) => b.content)
        .join("");
      assert.ok(
        text.includes(expected),
        `User message should contain "${expected}", got: "${text}"`
      );
    }
  }
);

// ============================================================================
// Phase: Session Messages
// ============================================================================

When("I check the session messages", async function (this: AgentXWorld) {
  const state = getState(this);
  const messages = await this.localAgentX!.sessions.getMessages(state.agentId!);
  (state as any).sessionMessages = messages;
});

Then(
  /^the session should contain an? "([^"]*)" message$/,
  function (this: AgentXWorld, role: string) {
    const state = getState(this);
    const messages = (state as any).sessionMessages as Array<{ role: string; subtype: string }>;
    assert.ok(messages, "Session messages not loaded");

    // Map role to subtype: "user" → "user", "assistant" → "assistant"
    const found = messages.some((m) => m.subtype === role || m.role === role);
    assert.ok(
      found,
      `Session should contain a "${role}" message, got subtypes: [${messages.map((m) => m.subtype).join(", ")}]`
    );
  }
);

// ============================================================================
// Phase: Presentation Tool Display
// ============================================================================

When(
  "I send message via presentation {string}",
  { timeout: 120000 },
  async function (this: AgentXWorld, text: string) {
    const state = getState(this);
    assert.ok(state.presentation, "Presentation not created");

    // Wait for the presentation to finish processing
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Presentation send timed out")), 110000);
      const checkDone = () => {
        const ps = state.presentation!.getState();
        if (ps.status === "idle" && !ps.streaming) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkDone, 200);
        }
      };
      state
        .presentation!.send(text)
        .then(() => {
          // After send resolves, poll until status returns to idle
          setTimeout(checkDone, 500);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }
);

Then("the presentation should have a completed tool block", function (this: AgentXWorld) {
  const state = getState(this);
  const ps = state.presentation!.getState();

  let found = false;
  for (const conv of ps.conversations) {
    if (conv.role === "assistant" && "blocks" in conv) {
      for (const block of conv.blocks) {
        if (block.type === "tool" && block.status === "completed") {
          found = true;
          break;
        }
      }
    }
    if (found) break;
  }

  assert.ok(
    found,
    `Expected a completed tool block in conversations, got: ${JSON.stringify(ps.conversations.map((c) => c.role))}`
  );
});

Then("the tool block toolInput should not be empty", function (this: AgentXWorld) {
  const state = getState(this);
  const ps = state.presentation!.getState();

  for (const conv of ps.conversations) {
    if (conv.role === "assistant" && "blocks" in conv) {
      for (const block of conv.blocks) {
        if (block.type === "tool" && block.status === "completed") {
          assert.ok(
            Object.keys(block.toolInput).length > 0,
            `Tool block toolInput should not be empty, got: ${JSON.stringify(block.toolInput)}`
          );
          return;
        }
      }
    }
  }
  assert.fail("No completed tool block found");
});

Then(
  "the tool block toolResult should contain {string}",
  function (this: AgentXWorld, expected: string) {
    const state = getState(this);
    const ps = state.presentation!.getState();

    for (const conv of ps.conversations) {
      if (conv.role === "assistant" && "blocks" in conv) {
        for (const block of conv.blocks) {
          if (block.type === "tool" && block.status === "completed") {
            assert.ok(
              block.toolResult?.includes(expected),
              `Tool block toolResult should contain "${expected}", got: ${JSON.stringify(block.toolResult)}`
            );
            return;
          }
        }
      }
    }
    assert.fail("No completed tool block found");
  }
);

Then(
  "the presentation should have at least {int} completed tool blocks",
  function (this: AgentXWorld, minCount: number) {
    const state = getState(this);
    const ps = state.presentation!.getState();

    let count = 0;
    for (const conv of ps.conversations) {
      if (conv.role === "assistant" && "blocks" in conv) {
        for (const block of conv.blocks) {
          if (block.type === "tool" && block.status === "completed") {
            count++;
          }
        }
      }
    }

    assert.ok(
      count >= minCount,
      `Expected at least ${minCount} completed tool blocks, got ${count}`
    );
  }
);

Then("each tool block should have non-empty toolInput", function (this: AgentXWorld) {
  const state = getState(this);
  const ps = state.presentation!.getState();

  let checked = 0;
  for (const conv of ps.conversations) {
    if (conv.role === "assistant" && "blocks" in conv) {
      for (const block of conv.blocks) {
        if (block.type === "tool") {
          assert.ok(
            Object.keys(block.toolInput).length > 0,
            `Tool block "${block.toolName}" has empty toolInput`
          );
          checked++;
        }
      }
    }
  }

  assert.ok(checked > 0, "No tool blocks found to check");
});

// ============================================================================
// Phase: Image Custom Data
// ============================================================================

When(
  "I create an image {string} in {string}",
  async function (this: AgentXWorld, name: string, containerId: string) {
    const result = await this.localAgentX!.images.create({
      containerId,
      name,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When(
  "I create an image {string} in {string} with customData:",
  async function (this: AgentXWorld, name: string, containerId: string, table: DataTable) {
    const customData: Record<string, unknown> = {};
    for (const row of table.hashes()) {
      // Parse "true"/"false" as booleans, numbers as numbers
      let value: unknown = row.value;
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (!Number.isNaN(Number(value))) value = Number(value);
      customData[row.key] = value;
    }

    const result = await this.localAgentX!.images.create({
      containerId,
      name,
      customData,
    });
    const state = getState(this);
    state.imageId = result.record.imageId;
    state.sessionId = result.record.sessionId;
  }
);

When("I update the image customData:", async function (this: AgentXWorld, table: DataTable) {
  const state = getState(this);
  const customData: Record<string, unknown> = {};
  for (const row of table.hashes()) {
    let value: unknown = row.value;
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (!Number.isNaN(Number(value))) value = Number(value);
    customData[row.key] = value;
  }

  const result = await this.localAgentX!.images.update(state.imageId!, {
    customData,
  });
  state.imageId = result.record.imageId;
});

When("I reload the image by id", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.images.get(state.imageId!);
  assert.ok(result.record, "Image should exist after reload");
});

When("I list images in {string}", async function (this: AgentXWorld, containerId: string) {
  const state = getState(this);
  const result = await this.localAgentX!.images.list(containerId);
  (state as any).imageList = result.records;
});

Then(
  "the image customData {string} should be {string}",
  async function (this: AgentXWorld, key: string, expected: string) {
    const state = getState(this);
    const result = await this.localAgentX!.images.get(state.imageId!);
    assert.ok(result.record, "Image should exist");
    assert.ok(result.record!.customData, "Image should have customData");
    assert.equal(
      String(result.record!.customData![key]),
      expected,
      `customData.${key} should be "${expected}"`
    );
  }
);

Then("the image should have no customData", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.images.get(state.imageId!);
  assert.ok(result.record, "Image should exist");
  const cd = result.record!.customData;
  assert.ok(!cd || Object.keys(cd).length === 0, "Image should have no customData");
});

Then(
  "the image list should contain {string} with customData {string} = {string}",
  function (this: AgentXWorld, name: string, key: string, expected: string) {
    const state = getState(this);
    const list = (state as any).imageList as any[];
    const image = list.find((r) => r.name === name);
    assert.ok(image, `Image "${name}" not found in list`);
    assert.ok(image.customData, `Image "${name}" should have customData`);
    assert.equal(
      String(image.customData[key]),
      expected,
      `Image "${name}" customData.${key} should be "${expected}"`
    );
  }
);

Then(
  "the image list should contain {string} without customData {string}",
  function (this: AgentXWorld, name: string, key: string) {
    const state = getState(this);
    const list = (state as any).imageList as any[];
    const image = list.find((r) => r.name === name);
    assert.ok(image, `Image "${name}" not found in list`);
    assert.ok(
      !image.customData || !(key in image.customData),
      `Image "${name}" should not have customData.${key}`
    );
  }
);

// ============================================================================
// Phase 4: Cleanup
// ============================================================================

When("I destroy the agent", async function (this: AgentXWorld) {
  const state = getState(this);
  for (const unsub of state.unsubscribes) {
    unsub();
  }
  state.unsubscribes = [];

  if (state.presentation) {
    state.presentation.dispose();
    state.presentation = undefined;
  }

  await this.localAgentX!.agents.destroy(state.agentId!);
});

Then("the agent should no longer exist", async function (this: AgentXWorld) {
  const state = getState(this);
  const result = await this.localAgentX!.agents.get(state.agentId!);
  assert.ok(!result.exists, "Agent should no longer exist");
});

// ============================================================================
// Phase 5: Log Level
// ============================================================================

// Console capture for log verification
let capturedLogs: string[] = [];
const originalConsoleMethods: Record<string, (...args: any[]) => void> = {};
let consoleIntercepted = false;

function startConsoleCapture() {
  capturedLogs = [];
  const methods = ["log", "info", "debug", "warn", "error"] as const;
  for (const method of methods) {
    originalConsoleMethods[method] = console[method];
    console[method] = (...args: any[]) => {
      capturedLogs.push(args.map(String).join(" "));
    };
  }
  consoleIntercepted = true;
}

function stopConsoleCapture() {
  if (!consoleIntercepted) return;
  for (const [method, fn] of Object.entries(originalConsoleMethods)) {
    (console as any)[method] = fn;
  }
  consoleIntercepted = false;
}

After(() => {
  stopConsoleCapture();
});

When(
  "I create AgentX with logLevel {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, logLevel: string) {
    const { createAgentX } = await import("agentxjs");

    // Start capturing BEFORE creating AgentX so we catch all init logs
    startConsoleCapture();

    this.localAgentX = await createAgentX({
      apiKey: env.apiKey,
      provider: "anthropic" as any,
      model: env.model,
      baseUrl: env.baseUrl,
      logLevel: logLevel as any,
      dataPath: ":memory:",
    });
  }
);

Then("console output should contain no AgentX logs", () => {
  stopConsoleCapture();

  // Filter for AgentX runtime log patterns (INFO/DEBUG/WARN/ERROR with component names)
  const agentxLogs = capturedLogs.filter(
    (line) =>
      /\b(INFO|DEBUG|WARN|ERROR)\b/.test(line) &&
      /\[.*\/(Persistence|AgentXRuntime|LocalClient|Container|Image|MonoDriver|Driver)\]/.test(line)
  );

  assert.equal(
    agentxLogs.length,
    0,
    `Expected no AgentX logs but found:\n${agentxLogs.join("\n")}`
  );
});

Then("console output should contain {string}", (expected: string) => {
  stopConsoleCapture();

  const hasMatch = capturedLogs.some((line) => line.includes(expected));
  assert.ok(
    hasMatch,
    `Expected console output to contain "${expected}" but captured ${capturedLogs.length} lines:\n${capturedLogs.slice(0, 20).join("\n")}`
  );
});

// ============================================================================
// Token Usage Steps (Feature 13)
// ============================================================================

Then("the presentation should have completed conversations", function (this: AgentXWorld) {
  const state = getState(this);
  const ps = state.presentation!.getState();
  const assistantConvs = ps.conversations.filter((c) => c.role === "assistant");
  assert.ok(
    assistantConvs.length > 0,
    `Expected at least 1 assistant conversation, got ${assistantConvs.length}`
  );
});

Then(
  "the last assistant conversation should have usage with inputTokens > {int}",
  function (this: AgentXWorld, minTokens: number) {
    const state = getState(this);
    const ps = state.presentation!.getState();
    const assistantConvs = ps.conversations.filter((c) => c.role === "assistant");
    assert.ok(assistantConvs.length > 0, "No assistant conversations found");

    const last = assistantConvs[assistantConvs.length - 1] as { usage?: { inputTokens: number } };
    assert.ok(
      last.usage,
      `Last assistant conversation has no usage data. Conversations: ${JSON.stringify(ps.conversations.map((c) => c.role))}`
    );
    assert.ok(
      last.usage.inputTokens > minTokens,
      `Expected inputTokens > ${minTokens}, got ${last.usage.inputTokens}`
    );
  }
);

Then(
  "the last assistant conversation should have usage with outputTokens > {int}",
  function (this: AgentXWorld, minTokens: number) {
    const state = getState(this);
    const ps = state.presentation!.getState();
    const assistantConvs = ps.conversations.filter((c) => c.role === "assistant");
    assert.ok(assistantConvs.length > 0, "No assistant conversations found");

    const last = assistantConvs[assistantConvs.length - 1] as { usage?: { outputTokens: number } };
    assert.ok(last.usage, `Last assistant conversation has no usage data`);
    assert.ok(
      last.usage.outputTokens > minTokens,
      `Expected outputTokens > ${minTokens}, got ${last.usage.outputTokens}`
    );
  }
);
