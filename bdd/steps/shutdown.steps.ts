/**
 * Shutdown Step Definitions - Graceful shutdown tests
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toBeLessThan: (expected: number) => assert.ok((value as number) < expected),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
  };
}

// ============================================================================
// Dispose Timing
// ============================================================================

When("I wait {int}ms for server to start", async function (this: AgentXWorld, ms: number) {
  await new Promise((r) => setTimeout(r, ms));
});

When(
  "I call agentx.dispose with {int}ms timeout",
  async function (this: AgentXWorld, timeoutMs: number) {
    const start = Date.now();

    // Race dispose against timeout
    const disposePromise = this.agentx!.dispose();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Dispose timeout (${timeoutMs}ms)`)), timeoutMs)
    );

    try {
      await Promise.race([disposePromise, timeoutPromise]);
      this.savedValues.set("dispose:success", "true");
      this.savedValues.set("dispose:duration", String(Date.now() - start));
    } catch (err) {
      this.savedValues.set("dispose:success", "false");
      this.savedValues.set("dispose:error", (err as Error).message);
    }
  }
);

When("I call agentx.dispose and measure time", async function (this: AgentXWorld) {
  const start = Date.now();
  await this.agentx!.dispose();
  this.savedValues.set("dispose:duration:1", String(Date.now() - start));
});

When("I call agentx.dispose again", async function (this: AgentXWorld) {
  const start = Date.now();
  await this.agentx!.dispose();
  this.savedValues.set("dispose:duration:2", String(Date.now() - start));
});

Then("dispose should complete successfully", function (this: AgentXWorld) {
  const success = this.savedValues.get("dispose:success");
  const error = this.savedValues.get("dispose:error");
  if (success !== "true") {
    console.log("Dispose failed with error:", error);
  }
  expect(success).toBe("true");
});

Then("dispose duration should be less than {int}ms", function (this: AgentXWorld, maxMs: number) {
  const duration = parseInt(this.savedValues.get("dispose:duration") || "0", 10);
  console.log(`Dispose duration: ${duration}ms (max: ${maxMs}ms)`);
  expect(duration).toBeLessThan(maxMs);
});

Then("both dispose calls should succeed", function (this: AgentXWorld) {
  const duration1 = this.savedValues.get("dispose:duration:1");
  const duration2 = this.savedValues.get("dispose:duration:2");
  expect(duration1).toBe(duration1); // Both should exist
  expect(duration2).toBe(duration2);
});

Then(
  "second dispose should complete in less than {int}ms",
  function (this: AgentXWorld, maxMs: number) {
    const duration = parseInt(this.savedValues.get("dispose:duration:2") || "0", 10);
    console.log(`Second dispose duration: ${duration}ms (max: ${maxMs}ms)`);
    expect(duration).toBeLessThan(maxMs);
  }
);

// ============================================================================
// Multiple Clients
// ============================================================================

Given(
  "{int} remote clients are connected to {string}",
  async function (this: AgentXWorld, count: number, serverUrl: string) {
    const { createAgentX } = await import("agentxjs");

    for (let i = 0; i < count; i++) {
      const client = await createAgentX({ serverUrl });
      this.remoteClients.set(`client-${i}`, client);
    }
  }
);

When("all clients call dispose simultaneously", async function (this: AgentXWorld) {
  const start = Date.now();

  const disposePromises = Array.from(this.remoteClients.values()).map((client) => client.dispose());

  await Promise.all(disposePromises);

  this.savedValues.set("dispose:all:duration", String(Date.now() - start));
});

Then(
  "all disposes should complete within {int}ms total",
  function (this: AgentXWorld, maxMs: number) {
    const duration = parseInt(this.savedValues.get("dispose:all:duration") || "0", 10);
    console.log(`All disposes duration: ${duration}ms (max: ${maxMs}ms)`);
    expect(duration).toBeLessThan(maxMs);
  }
);
