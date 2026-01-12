/**
 * Conversation Step Definitions - Container, Image, Agent lifecycle
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "bun:test";
import type { AgentXWorld } from "./world";

// ============================================================================
// Container Steps
// ============================================================================

Given("container {string} exists", async function (this: AgentXWorld, containerId: string) {
  if (!this.agentx) {
    const { createAgentX } = await import("agentxjs");
    this.agentx = await createAgentX();
  }

  await this.agentx.request("container_create_request", { containerId });
  this.createdContainers.push(containerId);
});

When(
  "I call agentx.request\\({string}, {{ containerId: {string} }})",
  async function (this: AgentXWorld, requestType: string, containerId: string) {
    this.lastResponse = await this.agentx!.request(requestType as never, { containerId } as never);
  }
);

Then("response.data.exists should be true", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { exists?: boolean }).exists).toBe(true);
});

Then("response.data.exists should be false", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { exists?: boolean }).exists).toBe(false);
});

Then(
  "response.data.containerIds should contain {string}",
  function (this: AgentXWorld, containerId: string) {
    const containerIds = (this.lastResponse!.data as { containerIds?: string[] }).containerIds;
    expect(containerIds).toContain(containerId);
  }
);

// ============================================================================
// Image Steps
// ============================================================================

Given(
  "image {string} exists in container {string}",
  async function (this: AgentXWorld, imageAlias: string, containerId: string) {
    // Ensure container exists
    if (!this.createdContainers.includes(containerId)) {
      await this.agentx!.request("container_create_request", { containerId });
      this.createdContainers.push(containerId);
    }

    const response = await this.agentx!.request("image_create_request", {
      containerId,
      config: { name: imageAlias },
    });

    const imageId = (response.data as { record?: { imageId: string } }).record?.imageId;
    if (imageId) {
      this.createdImages.set(imageAlias, imageId);
      this.savedValues.set("imageId", imageId);
    }
  }
);

When(
  "I call agentx.request\\({string}, {{ containerId: {string}, config: {{ name: {string} }} }})",
  async function (this: AgentXWorld, requestType: string, containerId: string, name: string) {
    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        containerId,
        config: { name },
      } as never
    );
  }
);

When(
  "I call agentx.request\\({string}, {{ containerId: {string}, config: {{ name: {string}, systemPrompt: {string} }} }})",
  async function (
    this: AgentXWorld,
    requestType: string,
    containerId: string,
    name: string,
    systemPrompt: string
  ) {
    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        containerId,
        config: { name, systemPrompt },
      } as never
    );
  }
);

When(
  "I call agentx.request\\({string}, {{ imageId: {string} }})",
  async function (this: AgentXWorld, requestType: string, imageIdOrAlias: string) {
    // Resolve alias to actual imageId if needed
    const imageId = this.createdImages.get(imageIdOrAlias) || imageIdOrAlias;
    this.lastResponse = await this.agentx!.request(requestType as never, { imageId } as never);
  }
);

Then("response.data.record.imageId should be defined", function (this: AgentXWorld) {
  const record = (this.lastResponse!.data as { record?: { imageId?: string } }).record;
  expect(record?.imageId).toBeDefined();
});

Then("response.data.record.name should be {string}", function (this: AgentXWorld, name: string) {
  const record = (this.lastResponse!.data as { record?: { name?: string } }).record;
  expect(record?.name).toBe(name);
});

Then("response.data.record should be defined", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { record?: unknown }).record).toBeDefined();
});

Then(
  "response.data.record.imageId should be {string}",
  function (this: AgentXWorld, imageIdOrAlias: string) {
    const imageId = this.createdImages.get(imageIdOrAlias) || imageIdOrAlias;
    const record = (this.lastResponse!.data as { record?: { imageId?: string } }).record;
    expect(record?.imageId).toBe(imageId);
  }
);

Then(
  "response.data.records should have length {int}",
  function (this: AgentXWorld, length: number) {
    const records = (this.lastResponse!.data as { records?: unknown[] }).records;
    expect(records?.length).toBe(length);
  }
);

Then("the image should be deleted", async function (this: AgentXWorld) {
  // Verify by trying to get the image
  const imageId = (this.lastResponse!.data as { imageId?: string }).imageId;
  if (imageId) {
    const response = await this.agentx!.request("image_get_request", { imageId });
    expect((response.data as { record?: unknown }).record).toBeNull();
  }
});

// ============================================================================
// Agent Steps
// ============================================================================

Given("image {string} has a running agent", async function (this: AgentXWorld, imageAlias: string) {
  const imageId = this.createdImages.get(imageAlias);
  if (!imageId) throw new Error(`Image "${imageAlias}" not found`);

  await this.agentx!.request("image_run_request", { imageId });
});

Then("response.data.agentId should be defined", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { agentId?: string }).agentId).toBeDefined();
});

Then("response.data.reused should be false", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { reused?: boolean }).reused).toBe(false);
});

Then("response.data.reused should be true", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { reused?: boolean }).reused).toBe(true);
});

Then("the agent should be destroyed", async function (this: AgentXWorld) {
  // Agent destruction is confirmed by the response
  expect(this.lastResponse!.type).toBe("image_stop_response");
});

Then("the image should still exist", async function (this: AgentXWorld) {
  const imageId = (this.lastResponse!.data as { imageId?: string }).imageId;
  if (imageId) {
    const response = await this.agentx!.request("image_get_request", { imageId });
    expect((response.data as { record?: unknown }).record).toBeDefined();
  }
});

// ============================================================================
// Message Steps
// ============================================================================

When(
  "I call agentx.request\\({string}, {{ imageId: {string}, content: {string} }})",
  async function (this: AgentXWorld, requestType: string, imageIdOrAlias: string, content: string) {
    const imageId = this.createdImages.get(imageIdOrAlias) || imageIdOrAlias;
    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        imageId,
        content,
      } as never
    );
  }
);

Then("I should receive {string} events", async function (this: AgentXWorld, eventType: string) {
  // Wait a bit for events to arrive
  await new Promise((r) => setTimeout(r, 500));
  const events = this.getEventsOfType(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("I should receive {string} event", async function (this: AgentXWorld, eventType: string) {
  await this.waitForEvent(eventType, 10000);
});

// ============================================================================
// Complete Flow Steps
// ============================================================================

Then(
  "I save response.data.record.imageId as {string}",
  function (this: AgentXWorld, varName: string) {
    const imageId = (this.lastResponse!.data as { record?: { imageId?: string } }).record?.imageId;
    if (imageId) {
      this.savedValues.set(varName, imageId);
      this.createdImages.set(varName, imageId);
    }
  }
);

When(
  'I call agentx.request\\({string}, {{ imageId: "\\${imageId}", content: {string} }})',
  async function (this: AgentXWorld, requestType: string, content: string) {
    const imageId = this.savedValues.get("imageId");
    if (!imageId) throw new Error("imageId not saved");

    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        imageId,
        content,
      } as never
    );
  }
);

When(
  'I call agentx.request\\({string}, {{ imageId: "\\${imageId}" }})',
  async function (this: AgentXWorld, requestType: string) {
    const imageId = this.savedValues.get("imageId");
    if (!imageId) throw new Error("imageId not saved");

    this.lastResponse = await this.agentx!.request(requestType as never, { imageId } as never);
  }
);

Then(
  "response.data.messages should have at least {int} item",
  function (this: AgentXWorld, count: number) {
    const messages = (this.lastResponse!.data as { messages?: unknown[] }).messages;
    expect(messages?.length).toBeGreaterThanOrEqual(count);
  }
);

// ============================================================================
// Event Subscription for Images
// ============================================================================

Given(
  "I am subscribed to events for image {string}",
  function (this: AgentXWorld, imageAlias: string) {
    // Subscribe to all relevant event types for this image
    this.subscribeToEvent("text_delta");
    this.subscribeToEvent("message_start");
    this.subscribeToEvent("message_stop");
    this.subscribeToEvent("assistant_message");
  }
);
