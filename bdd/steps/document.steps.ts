/**
 * Document Tests - Step Definitions
 *
 * Validates code examples from package READMEs.
 * These tests ensure documentation stays in sync with actual behavior.
 */

import { Given, When, Then, Before, After } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentXWorld } from "../support/world";

// ============================================================================
// Local Mode Steps
// ============================================================================

Given(
  "I have a local AgentX client with provider {string}",
  { timeout: 30000 },
  async function (this: AgentXWorld, provider: string) {
    const { createAgentX } = await import("agentxjs");

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.DEEPRACTICE_API_KEY || "test-key";
    const baseUrl = process.env.DEEPRACTICE_BASE_URL;
    const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

    this.localAgentX = await createAgentX({
      apiKey,
      provider: provider as any,
      model,
      baseUrl,
      dataPath: ".tmp",
    });
  }
);

When(
  "I create container {string} via local client",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.localAgentX!.containers.create(containerId);
    this.lastContainerId = result.containerId;
  }
);

Then(
  "the container {string} should exist via local client",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.localAgentX!.containers.get(containerId);
    assert.ok(result.exists, `Container ${containerId} should exist`);
  }
);

When(
  "I create an image in container {string} with systemPrompt {string}",
  async function (this: AgentXWorld, containerId: string, systemPrompt: string) {
    await this.localAgentX!.containers.create(containerId);
    const result = await this.localAgentX!.images.create({
      containerId,
      systemPrompt,
    });
    this.lastImageId = result.record.imageId;
    this.lastSessionId = result.record.sessionId;
  }
);

Then(
  "the image should have been created successfully",
  function (this: AgentXWorld) {
    assert.ok(this.lastImageId, "Image should have an imageId");
  }
);

Given(
  "I have container {string} via local client",
  async function (this: AgentXWorld, containerId: string) {
    await this.localAgentX!.containers.create(containerId);
    this.lastContainerId = containerId;
  }
);

Given(
  "I have an image in container {string} with systemPrompt {string}",
  async function (this: AgentXWorld, containerId: string, systemPrompt: string) {
    const result = await this.localAgentX!.images.create({
      containerId,
      systemPrompt,
    });
    this.lastImageId = result.record.imageId;
    this.lastSessionId = result.record.sessionId;
  }
);

Given(
  "I have an agent from the image via local client",
  { timeout: 30000 },
  async function (this: AgentXWorld) {
    const result = await this.localAgentX!.agents.create({
      imageId: this.lastImageId!,
    });
    this.lastAgentId = result.agentId;
  }
);

When(
  "I send message {string} via local client",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    this.localEvents = [];
    const unsub = this.localAgentX!.onAny((event) => {
      this.localEvents!.push(event);
    });
    await this.localAgentX!.sessions.send(this.lastAgentId!, message);
    // Wait briefly for events to propagate
    await new Promise((resolve) => setTimeout(resolve, 200));
    unsub();
  }
);

Then(
  "I should receive text_delta events via local client",
  function (this: AgentXWorld) {
    const textDeltas = this.localEvents!.filter((e) => e.type === "text_delta");
    assert.ok(textDeltas.length > 0, "Should have received text_delta events");
  }
);

Then(
  "I should receive a message_stop event via local client",
  function (this: AgentXWorld) {
    const stops = this.localEvents!.filter((e) => e.type === "message_stop");
    assert.ok(stops.length > 0, "Should have received a message_stop event");
  }
);

Given(
  "I subscribe to {string} events via local client",
  function (this: AgentXWorld, eventType: string) {
    this.eventHandlerCalled = false;
    this.localAgentX!.on(eventType, () => {
      this.eventHandlerCalled = true;
    });
  }
);

Then(
  "the event handler should have been called",
  function (this: AgentXWorld) {
    assert.ok(this.eventHandlerCalled, "Event handler should have been called");
  }
);

// ============================================================================
// Remote Mode Steps
// ============================================================================

Given(
  "the test server is running",
  async function (this: AgentXWorld) {
    // The test server is started in BeforeAll hook in world.ts
    const { AgentXWorld: World } = await import("../support/world");
    const serverUrl = World.getTestServerUrl();
    assert.ok(serverUrl, "Test server should be running");
  }
);

Given(
  "I have a remote AgentX client connected to the test server",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const { createAgentX } = await import("agentxjs");
    const { AgentXWorld: World } = await import("../support/world");
    const serverUrl = World.getTestServerUrl();
    this.remoteAgentX = await createAgentX({ serverUrl });
  }
);

When(
  "I create container {string} via remote client",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.remoteAgentX!.containers.create(containerId);
    this.lastContainerId = result.containerId;
  }
);

Then(
  "the container {string} should exist via remote client",
  async function (this: AgentXWorld, containerId: string) {
    const result = await this.remoteAgentX!.containers.get(containerId);
    assert.ok(result.exists, `Container ${containerId} should exist`);
  }
);

Then(
  "the image should have been created with a valid imageId",
  function (this: AgentXWorld) {
    assert.ok(this.lastImageId, "Should have a valid imageId");
    assert.ok(this.lastImageId!.startsWith("img_"), "imageId should start with img_");
  }
);

Given(
  "I have container {string} via remote client",
  async function (this: AgentXWorld, containerId: string) {
    await this.remoteAgentX!.containers.create(containerId);
    this.lastContainerId = containerId;
  }
);

When(
  "I create an image in container {string} via remote with systemPrompt {string}",
  async function (this: AgentXWorld, containerId: string, systemPrompt: string) {
    await this.remoteAgentX!.containers.create(containerId);
    const result = await this.remoteAgentX!.images.create({
      containerId,
      systemPrompt,
    });
    this.lastImageId = result.record.imageId;
    this.lastSessionId = result.record.sessionId;
  }
);

Given(
  "I have an image in container {string} via remote with systemPrompt {string}",
  async function (this: AgentXWorld, containerId: string, systemPrompt: string) {
    const result = await this.remoteAgentX!.images.create({
      containerId,
      systemPrompt,
    });
    this.lastImageId = result.record.imageId;
  }
);

Given(
  "I have an agent from the image via remote client",
  { timeout: 30000 },
  async function (this: AgentXWorld) {
    const result = await this.remoteAgentX!.agents.create({
      imageId: this.lastImageId!,
    });
    this.lastAgentId = result.agentId;
  }
);

When(
  "I send message {string} via remote client",
  { timeout: 30000 },
  async function (this: AgentXWorld, message: string) {
    this.remoteEvents = [];
    const unsub = this.remoteAgentX!.onAny((event) => {
      this.remoteEvents!.push(event);
    });
    await this.remoteAgentX!.sessions.send(this.lastAgentId!, message);
    // Wait for events to propagate over WebSocket
    await new Promise((resolve) => setTimeout(resolve, 500));
    unsub();
  }
);

Then(
  "I should receive text_delta events via remote client",
  function (this: AgentXWorld) {
    const textDeltas = this.remoteEvents!.filter((e) => e.type === "text_delta");
    assert.ok(textDeltas.length > 0, "Should have received text_delta events");
  }
);

Then(
  "the combined text should not be empty",
  function (this: AgentXWorld) {
    const textDeltas = this.remoteEvents!.filter((e) => e.type === "text_delta");
    const combined = textDeltas.map((e) => (e as any).data?.text ?? "").join("");
    assert.ok(combined.length > 0, "Combined text should not be empty");
  }
);

// ============================================================================
// MonoDriver Document Steps
// ============================================================================

Given(
  "I create a MonoDriver with config:",
  async function (this: AgentXWorld, dataTable: any) {
    const config = dataTable.rowsHash();
    const { createMonoDriver } = await import("@agentxjs/mono-driver");

    this.docDriver = createMonoDriver({
      apiKey: config.apiKey || "test-key",
      agentId: "doc-test",
      systemPrompt: "You are a helpful assistant.",
      options: { provider: config.provider || "anthropic" },
      model: config.model,
    });
  }
);

Then(
  "the driver should be created successfully",
  function (this: AgentXWorld) {
    assert.ok(this.docDriver, "Driver should exist");
  }
);

Then(
  "the driver should implement the Driver interface",
  function (this: AgentXWorld) {
    assert.ok(typeof this.docDriver!.initialize === "function", "Should have initialize()");
    assert.ok(typeof this.docDriver!.receive === "function", "Should have receive()");
    assert.ok(typeof this.docDriver!.dispose === "function", "Should have dispose()");
  }
);

// ============================================================================
// NodePlatform Document Steps
// ============================================================================

When(
  "I create a NodePlatform with default options",
  async function (this: AgentXWorld) {
    const { createNodePlatform } = await import("@agentxjs/node-platform");
    this.docPlatform = await createNodePlatform({ dataPath: ".tmp" });
  }
);

Then(
  "the platform should have a containerRepository",
  function (this: AgentXWorld) {
    assert.ok(this.docPlatform!.containerRepository, "Should have containerRepository");
  }
);

Then(
  "the platform should have an imageRepository",
  function (this: AgentXWorld) {
    assert.ok(this.docPlatform!.imageRepository, "Should have imageRepository");
  }
);

Then(
  "the platform should have a sessionRepository",
  function (this: AgentXWorld) {
    assert.ok(this.docPlatform!.sessionRepository, "Should have sessionRepository");
  }
);

Then(
  "the platform should have an eventBus",
  function (this: AgentXWorld) {
    assert.ok(this.docPlatform!.eventBus, "Should have eventBus");
  }
);

Given(
  "a temporary directory for data",
  function (this: AgentXWorld) {
    this.tempDir = mkdtempSync(join(tmpdir(), "agentx-doc-test-"));
  }
);

When(
  "I create a NodePlatform with dataPath set to the temp directory",
  async function (this: AgentXWorld) {
    const { createNodePlatform } = await import("@agentxjs/node-platform");
    this.docPlatform = await createNodePlatform({ dataPath: this.tempDir! });
  }
);

Then(
  "the platform should be created successfully",
  function (this: AgentXWorld) {
    assert.ok(this.docPlatform, "Provider should exist");
  }
);

Then(
  "the SQLite database should exist in the data directory",
  function (this: AgentXWorld) {
    const dbPath = join(this.tempDir!, "agentx.db");
    assert.ok(existsSync(dbPath), `Database should exist at ${dbPath}`);
  }
);

Then(
  "the platform should NOT have a createDriver property",
  function (this: AgentXWorld) {
    assert.ok(
      !("createDriver" in this.docPlatform!),
      "Provider should NOT have createDriver"
    );
  }
);

// ============================================================================
// Server Document Steps
// ============================================================================

Given(
  "I create a server with nodePlatform and MonoDriver on a random port",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const { createServer } = await import("@agentxjs/server");
    const { createNodePlatform } = await import("@agentxjs/node-platform");
    const { createMonoDriver } = await import("@agentxjs/mono-driver");
    const platform = await createNodePlatform({ dataPath: ".tmp" });
    const wrappedCreateDriver = (config: any) => {
      return createMonoDriver({ ...config, apiKey: "test-key", options: { provider: "anthropic" } });
    };

    // Use a random port
    const port = 15400 + Math.floor(Math.random() * 100);
    this.docServer = await createServer({ platform, createDriver: wrappedCreateDriver, port });
    this.docServerPort = port;
    await this.docServer!.listen();
  }
);

Then(
  "the server should be listening",
  function (this: AgentXWorld) {
    assert.ok(this.docServer, "Server should exist");
  }
);

When(
  "I connect a client to the server",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const { createAgentX } = await import("agentxjs");
    this.docClient = await createAgentX({
      serverUrl: `ws://localhost:${this.docServerPort}`,
    });
  }
);

Then(
  "the client should be connected",
  function (this: AgentXWorld) {
    assert.ok(this.docClient, "Client should exist");
    assert.ok(this.docClient!.connected, "Client should be connected");
  }
);

When(
  "I dispose the server",
  { timeout: 5000 },
  async function (this: AgentXWorld) {
    if (this.docClient) {
      await this.docClient!.dispose();
      this.docClient = undefined;
    }
    if (this.docServer) {
      await this.docServer!.dispose();
      this.docServer = undefined;
    }
  }
);

Then(
  "the server should be stopped",
  function (this: AgentXWorld) {
    assert.ok(!this.docServer, "Server should be disposed");
  }
);

Given(
  "I have a running test server",
  async function (this: AgentXWorld) {
    const { AgentXWorld: World } = await import("../support/world");
    assert.ok(World.getTestServerUrl(), "Test server should be running");
  }
);

Given(
  "I have a client connected to the test server",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const { createAgentX } = await import("agentxjs");
    const { AgentXWorld: World } = await import("../support/world");
    this.docClient = await createAgentX({ serverUrl: World.getTestServerUrl() });
  }
);

When(
  "I call {string} with containerId {string}",
  async function (this: AgentXWorld, method: string, containerId: string) {
    switch (method) {
      case "container.create":
        this.lastRpcResult = await this.docClient!.containers.create(containerId);
        break;
      case "container.get":
        this.lastRpcResult = await this.docClient!.containers.get(containerId);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
);

When(
  "I call {string}",
  async function (this: AgentXWorld, method: string) {
    switch (method) {
      case "container.list":
        this.lastRpcResult = await this.docClient!.containers.list();
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
);

Then(
  "the response should contain containerId {string}",
  function (this: AgentXWorld, containerId: string) {
    assert.equal((this.lastRpcResult as any).containerId, containerId);
  }
);

Then(
  "the response should show exists true",
  function (this: AgentXWorld) {
    assert.ok((this.lastRpcResult as any).exists, "Should exist");
  }
);

Then(
  "the response should include containerId {string}",
  function (this: AgentXWorld, containerId: string) {
    const containerIds = (this.lastRpcResult as any).containerIds;
    assert.ok(containerIds.includes(containerId), `Should include ${containerId}`);
  }
);
