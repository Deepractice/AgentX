/**
 * Event Step Definitions
 *
 * Steps for testing Event subscription:
 * - on(type, handler)
 * - onAny(handler)
 * - subscribe(sessionId)
 */

import { When, Then, Given } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { AgentXWorld } from "../../support/world";

// ============================================================================
// Event Subscription
// ============================================================================

/**
 * Subscribe to a specific event type
 */
When(
  "I subscribe to {string} events",
  function (this: AgentXWorld, eventType: string) {
    assert.ok(this.agentx, "AgentX client not initialized");
    this.subscribeToEvent(eventType);
  }
);

/**
 * Subscribe to all events
 */
When(
  "I subscribe to all events",
  function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    this.subscribeToAllEvents();
  }
);

/**
 * Subscribe to session events
 */
When(
  "I subscribe to session {string}",
  function (this: AgentXWorld, sessionId: string) {
    assert.ok(this.agentx, "AgentX client not initialized");

    // Resolve saved values
    const resolvedId = sessionId.replace(/\$\{(\w+)\}/g, (_, name) => {
      const saved = this.savedValues.get(name);
      assert.ok(saved, `Saved value "${name}" not found`);
      return saved;
    });

    this.agentx.subscribe(resolvedId);
  }
);

/**
 * Subscribe to the saved session
 */
When(
  "I subscribe to the saved session",
  function (this: AgentXWorld) {
    assert.ok(this.agentx, "AgentX client not initialized");
    const sessionId = this.savedValues.get("sessionId");
    assert.ok(sessionId, 'Saved value "sessionId" not found');

    this.agentx.subscribe(sessionId);
  }
);

/**
 * Clear collected events
 */
When(
  "I clear collected events",
  function (this: AgentXWorld) {
    this.clearEvents();
  }
);

// ============================================================================
// Event Assertions
// ============================================================================

/**
 * Wait for and check a specific event type was received
 */
Then(
  "I should receive a {string} event",
  async function (this: AgentXWorld, eventType: string) {
    const event = await this.waitForEvent(eventType, 10000);
    assert.ok(event, `Did not receive ${eventType} event`);
  }
);

/**
 * Wait for and check a specific event type was received within timeout
 */
Then(
  "I should receive a {string} event within {int} seconds",
  async function (this: AgentXWorld, eventType: string, seconds: number) {
    const event = await this.waitForEvent(eventType, seconds * 1000);
    assert.ok(event, `Did not receive ${eventType} event within ${seconds}s`);
  }
);

/**
 * Check number of events received of a type
 */
Then(
  "I should have received {int} {string} events",
  function (this: AgentXWorld, count: number, eventType: string) {
    const events = this.getEventsOfType(eventType);
    assert.strictEqual(
      events.length,
      count,
      `Expected ${count} ${eventType} events but got ${events.length}`
    );
  }
);

/**
 * Check at least N events received of a type
 */
Then(
  "I should have received at least {int} {string} events",
  function (this: AgentXWorld, minCount: number, eventType: string) {
    const events = this.getEventsOfType(eventType);
    assert.ok(
      events.length >= minCount,
      `Expected at least ${minCount} ${eventType} events but got ${events.length}`
    );
  }
);

/**
 * Check no events of type received
 */
Then(
  "I should not have received any {string} events",
  function (this: AgentXWorld, eventType: string) {
    const events = this.getEventsOfType(eventType);
    assert.strictEqual(
      events.length,
      0,
      `Expected no ${eventType} events but got ${events.length}`
    );
  }
);

/**
 * Check total events received
 */
Then(
  "I should have received {int} events in total",
  function (this: AgentXWorld, count: number) {
    assert.strictEqual(
      this.collectedEvents.length,
      count,
      `Expected ${count} total events but got ${this.collectedEvents.length}`
    );
  }
);

/**
 * Check at least N total events received
 */
Then(
  "I should have received at least {int} events in total",
  function (this: AgentXWorld, minCount: number) {
    assert.ok(
      this.collectedEvents.length >= minCount,
      `Expected at least ${minCount} total events but got ${this.collectedEvents.length}`
    );
  }
);

/**
 * Wait for assistant message event
 */
Then(
  "I should receive an assistant message",
  async function (this: AgentXWorld) {
    const event = await this.waitForEvent("assistant_message", 15000);
    assert.ok(event, "Did not receive assistant_message event");
  }
);

/**
 * Check collected events include specific event type with data
 */
Then(
  "the collected {string} events should include data matching:",
  function (this: AgentXWorld, eventType: string, docString: string) {
    const expected = JSON.parse(docString);
    const events = this.getEventsOfType(eventType);

    assert.ok(events.length > 0, `No ${eventType} events collected`);

    const matched = events.some((event) => {
      const data = (event as unknown as { data: Record<string, unknown> }).data;
      return Object.entries(expected).every(
        ([key, value]) => data[key] === value
      );
    });

    assert.ok(matched, `No ${eventType} event matched expected data`);
  }
);
