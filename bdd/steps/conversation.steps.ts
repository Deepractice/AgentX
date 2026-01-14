/**
 * Conversation Step Definitions - Container, Image, Agent lifecycle
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

function expect(value: unknown) {
  return {
    toBeDefined: () => assert.ok(value !== undefined && value !== null),
    toBeUndefined: () => assert.strictEqual(value, undefined),
    toBe: (expected: unknown) => assert.strictEqual(value, expected),
    toBeGreaterThan: (expected: number) => assert.ok((value as number) > expected),
    toBeGreaterThanOrEqual: (expected: number) => assert.ok((value as number) >= expected),
    toContain: (item: unknown) => assert.ok((value as unknown[]).includes(item)),
    toBeNull: () => assert.strictEqual(value, null),
  };
}

// ============================================================================
// Container Steps
// ============================================================================

Given(/^container "([^"]+)" exists$/, async function (this: AgentXWorld, containerId: string) {
  if (!this.agentx) {
    const { createAgentX } = await import("agentxjs");

    // If server port is set (from "an AgentX server is running"), use remote mode
    if (this.usedPorts.length > 0) {
      const port = this.usedPorts[0];
      this.agentx = await createAgentX({ serverUrl: `ws://localhost:${port}` });
      this.isConnected = true;
    } else {
      // Local mode
      const { resolveFromPackage } = await import("@agentxjs/common/path");
      const agentxDir = resolveFromPackage(import.meta, ".agentx-test");
      this.agentx = await createAgentX({ agentxDir });
    }
  }

  // Use unique container ID per scenario for isolation
  const uniqueContainerId = `${this.scenarioId}_${containerId}`;
  await this.agentx.request("container_create_request", { containerId: uniqueContainerId });
  this.createdContainers.push(uniqueContainerId);

  // Save mapping for lookups
  this.savedValues.set(`container:${containerId}`, uniqueContainerId);
});

// Generic response assertions
Then(/^I should receive "([^"]+)"$/, function (this: AgentXWorld, responseType: string) {
  expect(this.lastResponse).toBeDefined();
  expect(this.lastResponse!.type).toBe(responseType);
});

Then(
  /^response\.data\.containerId should be "([^"]+)"$/,
  function (this: AgentXWorld, containerId: string) {
    expect((this.lastResponse!.data as { containerId?: string }).containerId).toBe(containerId);
  }
);

Then("response.data.error should be undefined", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { error?: string }).error).toBeUndefined();
});

Then("response.data.exists should be true", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { exists?: boolean }).exists).toBe(true);
});

Then("response.data.exists should be false", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { exists?: boolean }).exists).toBe(false);
});

Then(
  /^response\.data\.containerIds should contain "([^"]+)"$/,
  function (this: AgentXWorld, containerId: string) {
    const containerIds = (this.lastResponse!.data as { containerIds?: string[] }).containerIds;
    // Match by suffix (test environment adds prefix like "test_{timestamp}_{seed}_")
    const found = containerIds?.some(
      (id) => id.endsWith(containerId) || id.includes(`_${containerId}`)
    );
    if (!found) {
      console.log("DEBUG: Expected containerId:", containerId);
      console.log("DEBUG: Actual containerIds:", containerIds);
    }
    expect(found).toBe(true);
  }
);

// ============================================================================
// Image Steps
// ============================================================================

Given(
  /^image "([^"]+)" exists in container "([^"]+)"$/,
  async function (this: AgentXWorld, imageAlias: string, containerId: string) {
    // Resolve unique container ID
    let uniqueContainerId = this.savedValues.get(`container:${containerId}`);

    if (!uniqueContainerId) {
      // Container doesn't exist yet, create it
      uniqueContainerId = `${this.scenarioId}_${containerId}`;
      await this.agentx!.request("container_create_request", { containerId: uniqueContainerId });
      this.createdContainers.push(uniqueContainerId);
      this.savedValues.set(`container:${containerId}`, uniqueContainerId);
    }

    const response = await this.agentx!.request("image_create_request", {
      containerId: uniqueContainerId,
      config: { name: imageAlias },
    });

    const imageId = (response.data as { record?: { imageId: string } }).record?.imageId;
    if (imageId) {
      this.createdImages.set(imageAlias, imageId);
      this.savedValues.set("imageId", imageId);
    }
  }
);

// Request with containerId and config.name
When(
  /^I call agentx\.request\("([^"]+)", \{ containerId: "([^"]+)", config: \{ name: "([^"]+)" \} \}\)$/,
  async function (this: AgentXWorld, requestType: string, containerId: string, name: string) {
    // Resolve unique container ID
    const uniqueContainerId = this.savedValues.get(`container:${containerId}`) || containerId;

    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        containerId: uniqueContainerId,
        config: { name },
      } as never
    );
  }
);

// Request with containerId and config.name and config.systemPrompt
When(
  /^I call agentx\.request\("([^"]+)", \{ containerId: "([^"]+)", config: \{ name: "([^"]+)", systemPrompt: "([^"]+)" \} \}\)$/,
  async function (
    this: AgentXWorld,
    requestType: string,
    containerId: string,
    name: string,
    systemPrompt: string
  ) {
    // Resolve unique container ID
    const uniqueContainerId = this.savedValues.get(`container:${containerId}`) || containerId;

    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        containerId: uniqueContainerId,
        config: { name, systemPrompt },
      } as never
    );
  }
);

// Request with imageId only
When(
  /^I call agentx\.request\("([^"]+)", \{ imageId: "([^"]+)" \}\)$/,
  async function (this: AgentXWorld, requestType: string, imageIdOrAlias: string) {
    const imageId = this.createdImages.get(imageIdOrAlias) || imageIdOrAlias;
    this.lastResponse = await this.agentx!.request(requestType as never, { imageId } as never);
  }
);

// Request with empty object (for container_list_request, etc)
When(
  /^I call agentx\.request\("([^"]+)", \{\}\)$/,
  async function (this: AgentXWorld, requestType: string) {
    this.lastResponse = await this.agentx!.request(requestType as never, {} as never);
  }
);

// Request with containerId only (for image_list_request)
When(
  /^I call agentx\.request\("([^"]+)", \{ containerId: "([^"]+)" \}\)$/,
  async function (this: AgentXWorld, requestType: string, containerId: string) {
    // Resolve unique container ID
    const uniqueContainerId = this.savedValues.get(`container:${containerId}`) || containerId;

    this.lastResponse = await this.agentx!.request(
      requestType as never,
      {
        containerId: uniqueContainerId,
      } as never
    );
  }
);

Then("response.data.record.imageId should be defined", function (this: AgentXWorld) {
  const record = (this.lastResponse!.data as { record?: { imageId?: string } }).record;
  expect(record?.imageId).toBeDefined();
});

Then(
  /^response\.data\.record\.name should be "([^"]+)"$/,
  function (this: AgentXWorld, name: string) {
    const record = (this.lastResponse!.data as { record?: { name?: string } }).record;
    expect(record?.name).toBe(name);
  }
);

Then("response.data.record should be defined", function (this: AgentXWorld) {
  expect((this.lastResponse!.data as { record?: unknown }).record).toBeDefined();
});

Then(
  /^response\.data\.record\.imageId should be "([^"]+)"$/,
  function (this: AgentXWorld, imageIdOrAlias: string) {
    const imageId = this.createdImages.get(imageIdOrAlias) || imageIdOrAlias;
    const record = (this.lastResponse!.data as { record?: { imageId?: string } }).record;
    expect(record?.imageId).toBe(imageId);
  }
);

Then(
  /^response\.data\.records should have length (\d+)$/,
  function (this: AgentXWorld, length: string) {
    const records = (this.lastResponse!.data as { records?: unknown[] }).records;
    const actualLength = records?.length || 0;
    const expectedLength = parseInt(length, 10);

    if (actualLength !== expectedLength) {
      console.log(`[DEBUG] Expected ${expectedLength} records, got ${actualLength}`);
      const responseData = this.lastResponse!.data as any;
      if (responseData.requestId) {
        console.log(`[DEBUG] Request ID: ${responseData.requestId}`);
      }
    }

    expect(actualLength).toBe(expectedLength);
  }
);

Then("the image should be deleted", async function (this: AgentXWorld) {
  const imageId = (this.lastResponse!.data as { imageId?: string }).imageId;
  if (imageId) {
    const response = await this.agentx!.request("image_get_request", { imageId });
    expect((response.data as { record?: unknown }).record).toBeNull();
  }
});

// ============================================================================
// Agent Steps
// ============================================================================

Given(
  /^image "([^"]+)" has a running agent$/,
  async function (this: AgentXWorld, imageAlias: string) {
    const imageId = this.createdImages.get(imageAlias);
    if (!imageId) throw new Error(`Image "${imageAlias}" not found`);

    await this.agentx!.request("image_run_request", { imageId });
  }
);

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
  /^I call agentx\.request\("([^"]+)", \{ imageId: "([^"]+)", content: "([^"]+)" \}\)$/,
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

Then(/^I should receive "([^"]+)" events$/, async function (this: AgentXWorld, eventType: string) {
  await new Promise((r) => setTimeout(r, 500));
  const events = this.getEventsOfType(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then(/^I should receive "([^"]+)" event$/, async function (this: AgentXWorld, eventType: string) {
  await this.waitForEvent(eventType, 10000);
});

// ============================================================================
// Complete Flow Steps
// ============================================================================

Then(
  /^I save response\.data\.record\.imageId as "([^"]+)"$/,
  function (this: AgentXWorld, varName: string) {
    const imageId = (this.lastResponse!.data as { record?: { imageId?: string } }).record?.imageId;
    if (imageId) {
      this.savedValues.set(varName, imageId);
      this.createdImages.set(varName, imageId);
    }
  }
);

// Request with saved imageId
When(
  /^I call agentx\.request\("([^"]+)", \{ imageId: "\$\{imageId\}", content: "([^"]+)" \}\)$/,
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
  /^I call agentx\.request\("([^"]+)", \{ imageId: "\$\{imageId\}" \}\)$/,
  async function (this: AgentXWorld, requestType: string) {
    const imageId = this.savedValues.get("imageId");
    if (!imageId) throw new Error("imageId not saved");

    this.lastResponse = await this.agentx!.request(requestType as never, { imageId } as never);
  }
);

Then(
  /^response\.data\.messages should have at least (\d+) item$/,
  function (this: AgentXWorld, count: string) {
    const messages = (this.lastResponse!.data as { messages?: unknown[] }).messages;
    expect(messages?.length).toBeGreaterThanOrEqual(parseInt(count, 10));
  }
);

// ============================================================================
// Event Subscription for Images
// ============================================================================

Given(
  /^I am subscribed to events for image "([^"]+)"$/,
  function (this: AgentXWorld, imageAlias: string) {
    this.subscribeToEvent("text_delta");
    this.subscribeToEvent("message_start");
    this.subscribeToEvent("message_stop");
    this.subscribeToEvent("assistant_message");

    // Also collect messages for reliability tests
    const clientId = "default";
    if (!this.receivedMessages.has(clientId)) {
      this.receivedMessages.set(clientId, []);
    }

    this.agentx!.on("assistant_message", (event) => {
      const content = (event.data as { content?: string }).content;
      if (content) {
        this.receivedMessages.get(clientId)!.push(content);
      }
    });
  }
);
