/**
 * Mock Environment Step Definitions
 */

import { Given, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toEqual: (expected: unknown) => assert.deepStrictEqual(value, expected),
    toContain: (item: unknown) => assert.ok((value as unknown[]).includes(item)),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
  };
}

// ============================================================================
// Mock Setup
// ============================================================================

Given("an AgentX instance with mock environment", async function (this: AgentXWorld) {
  await this.createMockAgentX();
});

Given(/^mock scenario is "([^"]+)"$/, function (this: AgentXWorld, scenario: string) {
  this.setMockScenario(scenario);
});

// ============================================================================
// Event Order Verification
// ============================================================================

Then("I should receive events in order:", function (this: AgentXWorld, dataTable: DataTable) {
  const expectedTypes = dataTable.raw().map((row) => row[0]);
  const actualTypes = this.collectedEvents.map((e) => e.type);
  expect(actualTypes).toEqual(expectedTypes);
});

Then(
  /^I should receive exactly (\d+) "([^"]+)" events$/,
  function (this: AgentXWorld, count: string, eventType: string) {
    const events = this.collectedEvents.filter((e) => e.type === eventType);
    expect(events.length).toBe(parseInt(count, 10));
  }
);

// ============================================================================
// Text Content Verification
// ============================================================================

Then(/^text should be "([^"]+)"$/, function (this: AgentXWorld, expectedText: string) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  const fullText = textDeltas.map((e) => (e.data as { text: string }).text).join("");
  expect(fullText).toBe(expectedText);
});

Then(/^text should contain "([^"]+)"$/, function (this: AgentXWorld, substring: string) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  const fullText = textDeltas.map((e) => (e.data as { text: string }).text).join("");
  expect(fullText).toContain(substring);
});

Then("I should receive text deltas", function (this: AgentXWorld) {
  const textDeltas = this.collectedEvents.filter((e) => e.type === "text_delta");
  expect(textDeltas.length).toBeGreaterThan(0);
});
