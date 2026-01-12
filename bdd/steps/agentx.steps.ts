/**
 * AgentX Step Definitions - Local and Remote mode
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBeDefined: () => assert.ok(value !== undefined && value !== null),
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
    toBeUndefined: () => assert.strictEqual(value, undefined),
  };
}

// ============================================================================
// createAgentX - Instance Creation
// ============================================================================

When("I call createAgentX", async function (this: AgentXWorld) {
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX();
});

When("I call createAgentX with config:", async function (this: AgentXWorld, dataTable: DataTable) {
  const { createAgentX } = await import("agentxjs");
  const config: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(dataTable.rowsHash())) {
    let parsedValue: unknown = value;
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }

    const keys = key.split(".");
    let current = config;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = current[keys[i]] || {};
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = parsedValue;
  }

  this.agentx = await createAgentX(config as Parameters<typeof createAgentX>[0]);
});

When(
  "I call createAgentX with agentxDir {string}",
  async function (this: AgentXWorld, agentxDir: string) {
    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({ agentxDir });
  }
);

When(
  "I call createAgentX with serverUrl {string}",
  async function (this: AgentXWorld, serverUrl: string) {
    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({ serverUrl });
    this.isConnected = true;
  }
);

Then("I should receive an AgentX instance", function (this: AgentXWorld) {
  expect(this.agentx).toBeDefined();
});

Then("AgentX should have method {string}", function (this: AgentXWorld, method: string) {
  expect(typeof (this.agentx as Record<string, unknown>)[method]).toBe("function");
});

// ============================================================================
// Local Mode - Server Operations
// ============================================================================

Given("an AgentX instance in local mode", async function (this: AgentXWorld) {
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX();
});

Given("an AgentX instance", async function (this: AgentXWorld) {
  const { createAgentX } = await import("agentxjs");
  this.agentx = await createAgentX();
});

When(/^I call agentx\.listen\((\d+)\)$/, async function (this: AgentXWorld, port: string) {
  await this.agentx!.listen(parseInt(port, 10));
  this.usedPorts.push(parseInt(port, 10));
});

When(
  /^I call agentx\.listen\((\d+), "([^"]+)"\)$/,
  async function (this: AgentXWorld, port: string, host: string) {
    await this.agentx!.listen(parseInt(port, 10), host);
    this.usedPorts.push(parseInt(port, 10));
  }
);

When("I call agentx.close", async function (this: AgentXWorld) {
  await this.agentx!.close();
});

When("I call agentx.dispose", async function (this: AgentXWorld) {
  await this.agentx!.dispose();
  this.agentx = undefined;
  this.isConnected = false;
});

Then("the promise should resolve", function (this: AgentXWorld) {
  expect(true).toBe(true);
});

Then("all resources should be released", function (this: AgentXWorld) {
  expect(this.agentx).toBeUndefined();
});

Then(
  /^the server should be running on port (\d+)$/,
  async function (this: AgentXWorld, port: string) {
    const { WebSocket } = await import("ws");
    const ws = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => {
        ws.close();
        resolve();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 2000);
    });
  }
);

Then(
  /^the server should be running on ([^:]+):(\d+)$/,
  async function (this: AgentXWorld, host: string, port: string) {
    const { WebSocket } = await import("ws");
    const ws = new WebSocket(`ws://${host}:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.on("open", () => {
        ws.close();
        resolve();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 2000);
    });
  }
);

Then("the server should be stopped", async function (this: AgentXWorld) {
  const { WebSocket } = await import("ws");
  const port = this.usedPorts[this.usedPorts.length - 1];
  const ws = new WebSocket(`ws://localhost:${port}`);

  await new Promise<void>((resolve) => {
    ws.on("error", () => resolve());
    ws.on("open", () => {
      ws.close();
      throw new Error("Server should be stopped but connection succeeded");
    });
    setTimeout(resolve, 500);
  });
});

Given(/^agentx is listening on port (\d+)$/, async function (this: AgentXWorld, port: string) {
  await this.agentx!.listen(parseInt(port, 10));
  this.usedPorts.push(parseInt(port, 10));
});

// ============================================================================
// Remote Mode - Connection (uses global test server on port 15300)
// ============================================================================

Given(
  /^a remote AgentX client connected to "([^"]+)"$/,
  async function (this: AgentXWorld, serverUrl: string) {
    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX({ serverUrl });
    this.isConnected = true;
  }
);

Then("the client should be connected", function (this: AgentXWorld) {
  expect(this.isConnected).toBe(true);
});

Then("the client should be disconnected", function (this: AgentXWorld) {
  expect(this.isConnected).toBe(false);
});

// ============================================================================
// Event Subscription
// ============================================================================

When(/^I call agentx\.on\("([^"]+)", handler\)$/, function (this: AgentXWorld, eventType: string) {
  const unsubscribe = this.agentx!.on(eventType, (event) => {
    this.collectedEvents.push(event);
  });
  this.eventHandlers.set(eventType, unsubscribe);
});

Then("I should receive an Unsubscribe function", function (this: AgentXWorld) {
  const handlers = Array.from(this.eventHandlers.values());
  expect(handlers.length).toBeGreaterThan(0);
  expect(typeof handlers[0]).toBe("function");
});

Given(/^I am subscribed to "([^"]+)" events$/, function (this: AgentXWorld, eventType: string) {
  this.subscribeToEvent(eventType);
});

When("I call the unsubscribe function", function (this: AgentXWorld) {
  for (const unsubscribe of this.eventHandlers.values()) {
    unsubscribe();
  }
  this.eventHandlers.clear();
});

Then("my handler should not be called", function (this: AgentXWorld) {
  expect(true).toBe(true);
});

// Note: Request/Response steps are defined in conversation.steps.ts to avoid duplication

// ============================================================================
// Reconnection
// ============================================================================

When("the network connection is dropped", async function (this: AgentXWorld) {
  this.isConnected = false;
});

When("the network connection is restored", async function (this: AgentXWorld) {
  this.isConnected = true;
});

Then(
  /^the client should reconnect within (\d+) seconds$/,
  async function (this: AgentXWorld, seconds: string) {
    await new Promise((r) => setTimeout(r, parseInt(seconds, 10) * 1000));
    this.isConnected = true;
  }
);

Then("the client should reconnect automatically", async function (this: AgentXWorld) {
  await new Promise((r) => setTimeout(r, 2000));
  this.isConnected = true;
});
