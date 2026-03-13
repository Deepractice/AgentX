/**
 * Steps for remote mode chat.create + present bug reproduction
 *
 * Reproduces: present.create() fails with "Image not found: agent_xxx"
 * Root cause: presentations.ts passed instanceId to imageNs.getMessages() which expects imageId
 */

import { strict as assert } from "node:assert";
import { Given, Then, When } from "@deepracticex/bdd";
import type { AgentHandle, AgentX, Presentation } from "agentxjs";
import { AgentXWorld } from "../support/world";

interface RemoteChatState {
  client?: AgentX;
  agent?: AgentHandle;
  presentation?: Presentation;
  error?: Error;
  presentError?: Error;
}

const KEY = "__remoteChat";

function getState(world: AgentXWorld): RemoteChatState {
  if (!(world as any)[KEY]) {
    (world as any)[KEY] = {};
  }
  return (world as any)[KEY];
}

Given(
  "a remote AgentX client connected to the test server",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const { createAgentX } = await import("agentxjs");
    const serverUrl = AgentXWorld.getTestServerUrl();

    const ax = createAgentX();
    const client = await ax.connect(serverUrl);
    getState(this).client = client;

    // Store for cleanup
    this.remoteAgentX = client;
  }
);

When(
  "I create a chat {string} via remote client",
  { timeout: 10000 },
  async function (this: AgentXWorld, name: string) {
    const state = getState(this);
    try {
      const agent = await state.client!.chat.create({
        name,
        embody: { systemPrompt: "You are a test assistant." },
      });
      state.agent = agent;
    } catch (err) {
      state.error = err as Error;
    }
  }
);

Then("the remote chat should have a valid instanceId", function (this: AgentXWorld) {
  const state = getState(this);

  if (state.error) {
    assert.fail(`chat.create() failed in remote mode: ${state.error.message}`);
  }

  assert.ok(state.agent, "chat.create() should return an AgentHandle");
  assert.ok(state.agent!.instanceId, "AgentHandle should have an instanceId");
  assert.ok(state.agent!.instanceId.length > 0, "instanceId should not be empty");
});

Then("the remote chat instanceId should not equal the imageId", function (this: AgentXWorld) {
  const state = getState(this);
  assert.ok(state.agent, "AgentHandle should exist");
  assert.notEqual(
    state.agent!.instanceId,
    state.agent!.imageId,
    "instanceId should be different from imageId (agent must be a real runtime instance)"
  );
});

When(
  "I create a presentation for the remote chat",
  { timeout: 10000 },
  async function (this: AgentXWorld) {
    const state = getState(this);
    assert.ok(state.agent, "AgentHandle must exist before creating presentation");

    try {
      const presentation = await state.agent!.present();
      state.presentation = presentation;
    } catch (err) {
      state.presentError = err as Error;
    }
  }
);

Then("the presentation should be created successfully", function (this: AgentXWorld) {
  const state = getState(this);

  if (state.presentError) {
    assert.fail(
      `handle.present() failed: ${state.presentError.message}\n` +
        "This is the bug: present.create() passes instanceId to imageNs.getMessages() which expects imageId"
    );
  }

  assert.ok(state.presentation, "Presentation should be created");
  const ps = state.presentation!.getState();
  assert.ok(ps, "Presentation state should exist");
  assert.equal(ps.status, "idle", "Initial presentation status should be idle");
});
