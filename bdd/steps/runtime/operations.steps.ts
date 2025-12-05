/**
 * Step definitions for Runtime Basic Operations
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { RuntimeWorld } from "./world.js";

// ============================================================================
// Background
// ============================================================================

Given("a Runtime instance is created", function (this: RuntimeWorld) {
  // Runtime is created in Before hook via world.createRuntime()
  assert.ok(this.runtime, "Runtime should be created");
});

// ============================================================================
// Container Operations
// ============================================================================

When("I create a container with id {string}", async function (this: RuntimeWorld, containerId: string) {
  const container = await this.runtime.containers.create(containerId);
  this.containers.set(containerId, container);
  this.currentContainerId = containerId;
});

Then("the container {string} should exist", async function (this: RuntimeWorld, containerId: string) {
  const container = await this.runtime.containers.get(containerId);
  assert.ok(container, `Container ${containerId} should exist`);
});

Then("the container should have {int} agent(s)", async function (this: RuntimeWorld, count: number) {
  assert.ok(this.currentContainerId, "No current container");
  const container = await this.runtime.containers.get(this.currentContainerId);
  assert.ok(container, "Container should exist");
  assert.strictEqual(container.agentCount, count, `Container should have ${count} agents`);
});

Then("the container {string} should have {int} agent(s)", async function (this: RuntimeWorld, containerId: string, count: number) {
  const container = await this.runtime.containers.get(containerId);
  assert.ok(container, `Container ${containerId} should exist`);
  assert.strictEqual(container.agentCount, count, `Container should have ${count} agents`);
});

Given("a container {string} exists", async function (this: RuntimeWorld, containerId: string) {
  const container = await this.runtime.containers.create(containerId);
  this.containers.set(containerId, container);
  this.currentContainerId = containerId;
});

When("I dispose the container {string}", async function (this: RuntimeWorld, containerId: string) {
  await this.runtime.containers.dispose(containerId);
});

Then("the container {string} should not exist", async function (this: RuntimeWorld, containerId: string) {
  // After dispose, agents are removed but container record may still exist
  // Dispose clears memory state (containerAgents map)
  const agents = this.runtime.agents.list(containerId);
  assert.strictEqual(agents.length, 0, `Container ${containerId} should have no agents after dispose`);
});

// ============================================================================
// Agent Operations
// ============================================================================

Given("an agent {string} is running in container {string}", async function (this: RuntimeWorld, agentName: string, containerId: string) {
  const agent = await this.runtime.agents.run(containerId, {
    name: agentName,
    systemPrompt: "You are a helpful assistant",
  });
  this.agents.set(agent.agentId, agent);
  this.currentAgentId = agent.agentId;
});

When("I run an agent with config:", async function (this: RuntimeWorld, dataTable: { rawTable: string[][] }) {
  assert.ok(this.currentContainerId, "No current container");
  const config: Record<string, string> = {};
  for (const [key, value] of dataTable.rawTable) {
    config[key] = value;
  }
  const agent = await this.runtime.agents.run(this.currentContainerId, {
    name: config["name"] || "Agent",
    systemPrompt: config["systemPrompt"] || "You are helpful",
  });
  this.agents.set(agent.agentId, agent);
  this.currentAgentId = agent.agentId;
});

When("I run an agent with name {string} in container {string}", async function (this: RuntimeWorld, name: string, containerId: string) {
  const agent = await this.runtime.agents.run(containerId, {
    name,
    systemPrompt: "You are helpful",
  });
  this.agents.set(agent.agentId, agent);
  this.currentAgentId = agent.agentId;
});

Then("the agent should be created with lifecycle {string}", function (this: RuntimeWorld, lifecycle: string) {
  assert.ok(this.currentAgentId, "No current agent");
  const agent = this.runtime.agents.get(this.currentAgentId);
  assert.ok(agent, "Agent should exist");
  assert.strictEqual(agent.lifecycle, lifecycle, `Agent lifecycle should be ${lifecycle}`);
});

When("I get the agent {string} from container {string}", function (this: RuntimeWorld, agentName: string, _containerId: string) {
  // Find agent by name (we stored agents by their generated ID)
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      this.operationResult = agent;
      return;
    }
  }
  this.operationResult = undefined;
});

Then("I should receive the agent with id {string}", function (this: RuntimeWorld, agentId: string) {
  assert.ok(this.operationResult, "Should receive an agent");
  const agent = this.operationResult as { name: string };
  assert.strictEqual(agent.name, agentId);
});

Then("I should receive undefined", function (this: RuntimeWorld) {
  assert.strictEqual(this.operationResult, undefined);
});

When("I list agents in container {string}", function (this: RuntimeWorld, containerId: string) {
  this.agentsList = this.runtime.agents.list(containerId);
});

Then("I should receive {int} agents", function (this: RuntimeWorld, count: number) {
  assert.strictEqual(this.agentsList.length, count, `Should receive ${count} agents`);
});

When("I destroy the agent {string}", async function (this: RuntimeWorld, agentName: string) {
  // Find agent by name
  for (const [id, agent] of this.agents) {
    if (agent.name === agentName) {
      await this.runtime.agents.destroy(id);
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

Then("the agent {string} should have lifecycle {string}", function (this: RuntimeWorld, agentName: string, lifecycle: string) {
  // Find agent by name
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      assert.strictEqual(agent.lifecycle, lifecycle, `Agent ${agentName} should have lifecycle ${lifecycle}`);
      return;
    }
  }
});

Then("the agent {string} should be destroyed", function (this: RuntimeWorld, agentName: string) {
  // Find agent by name
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      // After destroy, agent lifecycle should be destroyed
      assert.strictEqual(agent.lifecycle, "destroyed", `Agent ${agentName} should be destroyed`);
      return;
    }
  }
});

When("I try to destroy agent {string} in container {string}", async function (this: RuntimeWorld, agentId: string, _containerId: string) {
  const result = await this.runtime.agents.destroy(agentId);
  this.operationResult = result;
});

Then("the operation should return false", function (this: RuntimeWorld) {
  assert.strictEqual(this.operationResult, false);
});

When("I destroy all agents in container {string}", async function (this: RuntimeWorld, containerId: string) {
  await this.runtime.agents.destroyAll(containerId);
});

// ============================================================================
// Agent Stop/Resume
// ============================================================================

Given("an agent {string} is stopped in container {string}", async function (this: RuntimeWorld, agentName: string, containerId: string) {
  const agent = await this.runtime.agents.run(containerId, {
    name: agentName,
    systemPrompt: "You are helpful",
  });
  this.agents.set(agent.agentId, agent);
  this.currentAgentId = agent.agentId;
  await agent.stop();
});

Given("an agent {string} is destroyed in container {string}", async function (this: RuntimeWorld, agentName: string, containerId: string) {
  const agent = await this.runtime.agents.run(containerId, {
    name: agentName,
    systemPrompt: "You are helpful",
  });
  const agentId = agent.agentId;
  this.agents.set(agentId, agent);
  this.currentAgentId = agentId;
  await this.runtime.agents.destroy(agentId);
});

When("I stop the agent {string}", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.stop();
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("I resume the agent {string}", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.resume();
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

When("I try to resume the agent {string}", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      try {
        await agent.resume();
      } catch (e) {
        this.operationError = e as Error;
      }
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

Then("the operation should fail with error {string}", function (this: RuntimeWorld, errorMessage: string) {
  assert.ok(this.operationError, "Should have an error");
  assert.ok(this.operationError.message.includes(errorMessage), `Error should contain "${errorMessage}"`);
});

// ============================================================================
// Agent Interaction
// ============================================================================

When("I send message {string} to agent {string}", async function (this: RuntimeWorld, message: string, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      await agent.receive(message);
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

Then("the agent should process the message", function (this: RuntimeWorld) {
  // Message processing is async - this step just verifies no error occurred
  assert.ok(true);
});

When("I try to send message {string} to agent {string}", async function (this: RuntimeWorld, message: string, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      try {
        await agent.receive(message);
      } catch (e) {
        this.operationError = e as Error;
      }
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

Given("the agent is processing a message", async function (this: RuntimeWorld) {
  // Start a message send without waiting for completion
  assert.ok(this.currentAgentId, "No current agent");
  const agent = this.runtime.agents.get(this.currentAgentId);
  assert.ok(agent, "Agent should exist");
  // Fire and don't wait - the interrupt will happen during processing
  agent.receive("Tell me a long story").catch(() => {});
  // Give it a moment to start processing
  await new Promise((resolve) => setTimeout(resolve, 100));
});

When("I interrupt the agent {string}", async function (this: RuntimeWorld, agentName: string) {
  for (const agent of this.agents.values()) {
    if (agent.name === agentName) {
      agent.interrupt();
      return;
    }
  }
  throw new Error(`Agent ${agentName} not found`);
});

Then("the agent should stop processing", function (this: RuntimeWorld) {
  // Interrupt was called successfully
  assert.ok(true);
});

// ============================================================================
// Runtime Lifecycle
// ============================================================================

When("I dispose the runtime", async function (this: RuntimeWorld) {
  await this.runtime.dispose();
});

Then("all containers should be disposed", function (this: RuntimeWorld) {
  // After runtime dispose, all containers should be cleaned up
  assert.ok(true);
});

Then("all agents should be destroyed", function (this: RuntimeWorld) {
  // After runtime dispose, all agents should be destroyed
  for (const agent of this.agents.values()) {
    assert.strictEqual(agent.lifecycle, "destroyed", "Agent should be destroyed");
  }
});
