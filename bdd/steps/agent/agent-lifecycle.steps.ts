/**
 * Step definitions for agent-lifecycle.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert";
import { createAgent } from "@agentxjs/agent";
import type { AgentWorld } from "./world.js";
import { MockDriver, MockPresenter } from "../../mocks/index.js";

// ==================== Background ====================

Given("a mock driver named {string}", function (this: AgentWorld, name: string) {
  this.driver = new MockDriver({ name });
});

Given("a mock presenter named {string}", function (this: AgentWorld, name: string) {
  this.presenter = new MockPresenter(name);
});

// ==================== Create ====================

When("I create an agent with the driver and presenter", function (this: AgentWorld) {
  this.agent = createAgent({ driver: this.driver, presenter: this.presenter });
});

When("I create {int} agents with different drivers", function (this: AgentWorld, count: number) {
  for (let i = 0; i < count; i++) {
    const d = new MockDriver({ name: `Driver-${i}` });
    const p = new MockPresenter(`Presenter-${i}`);
    this.agents.push(createAgent({ driver: d, presenter: p }));
  }
});

Then("the agent should be created successfully", function (this: AgentWorld) {
  assert.ok(this.agent !== null && this.agent !== undefined, "Agent should not be null");
});

Then("the agent should have a unique agentId", function (this: AgentWorld) {
  assert.ok(this.agent.agentId, "Agent should have an agentId");
  assert.strictEqual(typeof this.agent.agentId, "string");
  assert.ok(this.agent.agentId.length > 0, "AgentId should not be empty");
});

Then("the agent createdAt should be set", function (this: AgentWorld) {
  assert.ok(this.agent.createdAt, "Agent should have createdAt");
  assert.strictEqual(typeof this.agent.createdAt, "number");
  assert.ok(this.agent.createdAt <= Date.now(), "createdAt should be in the past");
});

Then("the agent state should be {string}", function (this: AgentWorld, state: string) {
  assert.strictEqual(this.agent.state, state);
});

Then("the agent messageQueue should be empty", function (this: AgentWorld) {
  assert.strictEqual(this.agent.messageQueue.isEmpty, true);
  assert.strictEqual(this.agent.messageQueue.length, 0);
});

Then("each agent should have a unique agentId", function (this: AgentWorld) {
  const ids = this.agents.map((a) => a.agentId);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, this.agents.length);
});

// ==================== Destroy ====================

Given("an agent is created", function (this: AgentWorld) {
  this.agent = createAgent({ driver: this.driver, presenter: this.presenter });
});

Given("the agent state is {string}", function (this: AgentWorld, state: string) {
  assert.strictEqual(this.agent.state, state);
});

When("I call destroy on the agent", async function (this: AgentWorld) {
  await this.agent.destroy();
});

Then("the driver interrupt should be called", function (this: AgentWorld) {
  assert.strictEqual(this.driver.interruptCalled, true);
});

// ==================== Lifecycle Events ====================

Given("I subscribe to onDestroy", function (this: AgentWorld) {
  this.agent.onDestroy(() => {
    this.destroyHandlerCalled = true;
  });
});

When("I subscribe to onReady", function (this: AgentWorld) {
  this.readyHandlerCalled = false;
  this.agent.onReady(() => {
    this.readyHandlerCalled = true;
  });
});

Then("the handler should be called immediately", function (this: AgentWorld) {
  assert.strictEqual(this.readyHandlerCalled, true);
});

Then("the onDestroy handler should be called", function (this: AgentWorld) {
  assert.strictEqual(this.destroyHandlerCalled, true);
});
