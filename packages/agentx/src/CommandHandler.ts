/**
 * CommandHandler - Handles JSON-RPC requests directly
 *
 * No longer uses EventBus for request/response. Instead:
 * - Receives RPC requests directly
 * - Returns RPC responses directly
 * - EventBus is only used for stream events (notifications)
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import type { RpcMethod } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import { createLogger } from "@deepracticex/logger";

const logger = createLogger("server/CommandHandler");

/**
 * RPC Result type
 */
export interface RpcResult<T = unknown> {
  success: true;
  data: T;
}

export interface RpcError {
  success: false;
  code: number;
  message: string;
}

export type RpcResponse<T = unknown> = RpcResult<T> | RpcError;

/**
 * Helper to create success result
 */
function ok<T>(data: T): RpcResult<T> {
  return { success: true, data };
}

/**
 * Helper to create error result
 */
function err(code: number, message: string): RpcError {
  return { success: false, code, message };
}

/**
 * CommandHandler - Processes RPC requests directly
 */
export class CommandHandler {
  private readonly runtime: AgentXRuntime;

  constructor(runtime: AgentXRuntime) {
    this.runtime = runtime;
    logger.debug("CommandHandler created");
  }

  /**
   * Handle an RPC request and return response
   */
  async handle(method: RpcMethod, params: unknown): Promise<RpcResponse> {
    logger.debug("Handling RPC request", { method });

    try {
      switch (method) {
        // Container
        case "container.create":
          return await this.handleContainerCreate(params);
        case "container.get":
          return await this.handleContainerGet(params);
        case "container.list":
          return await this.handleContainerList(params);

        // Image
        case "image.create":
          return await this.handleImageCreate(params);
        case "image.get":
          return await this.handleImageGet(params);
        case "image.list":
          return await this.handleImageList(params);
        case "image.delete":
          return await this.handleImageDelete(params);
        case "image.run":
          return await this.handleImageRun(params);
        case "image.stop":
          return await this.handleImageStop(params);
        case "image.update":
          return await this.handleImageUpdate(params);
        case "image.messages":
          return await this.handleImageMessages(params);

        // Instance
        case "instance.get":
          return await this.handleAgentGet(params);
        case "instance.list":
          return await this.handleAgentList(params);
        case "instance.destroy":
          return await this.handleAgentDestroy(params);
        case "instance.destroyAll":
          return await this.handleAgentDestroyAll(params);
        case "instance.interrupt":
          return await this.handleAgentInterrupt(params);

        // Message
        case "message.send":
          return await this.handleMessageSend(params);

        // Prototype
        case "prototype.create":
          return await this.handlePrototypeCreate(params);
        case "prototype.get":
          return await this.handlePrototypeGet(params);
        case "prototype.list":
          return await this.handlePrototypeList(params);
        case "prototype.update":
          return await this.handlePrototypeUpdate(params);
        case "prototype.delete":
          return await this.handlePrototypeDelete(params);

        // LLM Provider
        case "llm.create":
          return await this.handleLLMCreate(params);
        case "llm.get":
          return await this.handleLLMGet(params);
        case "llm.list":
          return await this.handleLLMList(params);
        case "llm.update":
          return await this.handleLLMUpdate(params);
        case "llm.delete":
          return await this.handleLLMDelete(params);
        case "llm.default":
          return await this.handleLLMDefault(params);

        default:
          return err(-32601, `Method not found: ${method}`);
      }
    } catch (error) {
      logger.error("RPC handler error", { method, error });
      return err(-32000, error instanceof Error ? error.message : String(error));
    }
  }

  // ==================== Container Commands ====================

  private async handleContainerCreate(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId: string };
    const { getOrCreateContainer } = await import("@agentxjs/core/container");
    const { containerRepository, imageRepository, sessionRepository } = this.runtime.platform;

    const container = await getOrCreateContainer(containerId, {
      containerRepository,
      imageRepository,
      sessionRepository,
    });

    return ok({ containerId: container.containerId });
  }

  private async handleContainerGet(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId: string };
    const exists = await this.runtime.platform.containerRepository.containerExists(containerId);
    return ok({ containerId, exists });
  }

  private async handleContainerList(_params: unknown): Promise<RpcResponse> {
    const containers = await this.runtime.platform.containerRepository.findAllContainers();
    return ok({ containerIds: containers.map((c) => c.containerId) });
  }

  // ==================== Image Commands ====================

  private async handleImageCreate(params: unknown): Promise<RpcResponse> {
    const { containerId, name, description, contextId, embody, customData } = params as {
      containerId: string;
      name?: string;
      description?: string;
      contextId?: string;
      embody?: import("@agentxjs/core/persistence").Embodiment;
      customData?: Record<string, unknown>;
    };

    const { imageRepository, sessionRepository } = this.runtime.platform;
    const { createImage } = await import("@agentxjs/core/image");

    const image = await createImage(
      { containerId, name, description, contextId, embody, customData },
      { imageRepository, sessionRepository }
    );

    return ok({
      record: image.toRecord(),
      __subscriptions: [image.sessionId],
    });
  }

  private async handleImageGet(params: unknown): Promise<RpcResponse> {
    const { imageId } = params as { imageId: string };
    const record = await this.runtime.platform.imageRepository.findImageById(imageId);
    return ok({
      record,
      __subscriptions: record?.sessionId ? [record.sessionId] : undefined,
    });
  }

  private async handleImageList(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId?: string };
    const records = containerId
      ? await this.runtime.platform.imageRepository.findImagesByContainerId(containerId)
      : await this.runtime.platform.imageRepository.findAllImages();

    return ok({
      records,
      __subscriptions: records.map((r) => r.sessionId),
    });
  }

  private async handleImageDelete(params: unknown): Promise<RpcResponse> {
    const { imageId } = params as { imageId: string };
    const { loadImage } = await import("@agentxjs/core/image");
    const { imageRepository, sessionRepository } = this.runtime.platform;

    const image = await loadImage(imageId, { imageRepository, sessionRepository });
    if (image) {
      await image.delete();
    }

    return ok({ imageId });
  }

  private async handleImageRun(params: unknown): Promise<RpcResponse> {
    const { imageId, instanceId: requestedInstanceId } = params as {
      imageId: string;
      instanceId?: string;
    };

    // Check if already have a running agent for this image
    const existingAgent = this.runtime
      .getAgents()
      .find((a) => a.imageId === imageId && a.lifecycle === "running");

    if (existingAgent) {
      logger.debug("Reusing existing agent for image", {
        imageId,
        instanceId: existingAgent.instanceId,
      });
      return ok({
        imageId,
        instanceId: existingAgent.instanceId,
        sessionId: existingAgent.sessionId,
        containerId: existingAgent.containerId,
        reused: true,
      });
    }

    // Create new agent (with optional custom instanceId)
    const agent = await this.runtime.createAgent({
      imageId,
      instanceId: requestedInstanceId,
    });
    logger.info("Created new agent for image", {
      imageId,
      instanceId: agent.instanceId,
    });

    return ok({
      imageId,
      instanceId: agent.instanceId,
      sessionId: agent.sessionId,
      containerId: agent.containerId,
      reused: false,
    });
  }

  private async handleImageStop(params: unknown): Promise<RpcResponse> {
    const { imageId } = params as { imageId: string };

    // Find running agent for this image
    const agent = this.runtime
      .getAgents()
      .find((a) => a.imageId === imageId && a.lifecycle === "running");

    if (agent) {
      await this.runtime.stopAgent(agent.instanceId);
      logger.info("Stopped agent for image", { imageId, instanceId: agent.instanceId });
    } else {
      logger.debug("No running agent found for image", { imageId });
    }

    return ok({ imageId });
  }

  private async handleImageUpdate(params: unknown): Promise<RpcResponse> {
    const { imageId, updates } = params as {
      imageId: string;
      updates: {
        name?: string;
        description?: string;
        embody?: import("@agentxjs/core/persistence").Embodiment;
        customData?: Record<string, unknown>;
      };
    };

    // Get existing image
    const imageRecord = await this.runtime.platform.imageRepository.findImageById(imageId);
    if (!imageRecord) {
      return err(404, `Image not found: ${imageId}`);
    }

    // Update image record (embody is merged, not replaced)
    const { embody: embodyUpdates, ...otherUpdates } = updates;
    const updatedRecord = {
      ...imageRecord,
      ...otherUpdates,
      embody: embodyUpdates ? { ...imageRecord.embody, ...embodyUpdates } : imageRecord.embody,
      updatedAt: Date.now(),
    };

    await this.runtime.platform.imageRepository.saveImage(updatedRecord);

    logger.info("Updated image", { imageId, updates });

    return ok({ record: updatedRecord });
  }

  private async handleImageMessages(params: unknown): Promise<RpcResponse> {
    const { imageId } = params as { imageId: string };

    // Get image record to find sessionId
    const imageRecord = await this.runtime.platform.imageRepository.findImageById(imageId);
    if (!imageRecord) {
      return err(404, `Image not found: ${imageId}`);
    }

    // Get messages from session
    const messages = await this.runtime.platform.sessionRepository.getMessages(
      imageRecord.sessionId
    );

    logger.debug("Got messages for image", { imageId, count: messages.length });

    return ok({ imageId, messages });
  }

  // ==================== Agent Commands ====================

  private async handleAgentGet(params: unknown): Promise<RpcResponse> {
    const { instanceId } = params as { instanceId: string };
    const agent = this.runtime.getAgent(instanceId);

    return ok({
      agent: agent
        ? {
            instanceId: agent.instanceId,
            imageId: agent.imageId,
            containerId: agent.containerId,
            sessionId: agent.sessionId,
            lifecycle: agent.lifecycle,
          }
        : null,
      exists: !!agent,
    });
  }

  private async handleAgentList(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId?: string };
    const agents = containerId
      ? this.runtime.getAgentsByContainer(containerId)
      : this.runtime.getAgents();

    return ok({
      agents: agents.map((a) => ({
        instanceId: a.instanceId,
        imageId: a.imageId,
        containerId: a.containerId,
        sessionId: a.sessionId,
        lifecycle: a.lifecycle,
      })),
    });
  }

  private async handleAgentDestroy(params: unknown): Promise<RpcResponse> {
    const { instanceId } = params as { instanceId: string };

    // Check if agent exists first
    const agent = this.runtime.getAgent(instanceId);
    if (!agent) {
      return ok({ instanceId, success: false });
    }

    await this.runtime.destroyAgent(instanceId);
    return ok({ instanceId, success: true });
  }

  private async handleAgentDestroyAll(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId: string };
    const agents = this.runtime.getAgentsByContainer(containerId);
    for (const agent of agents) {
      await this.runtime.destroyAgent(agent.instanceId);
    }
    return ok({ containerId });
  }

  private async handleAgentInterrupt(params: unknown): Promise<RpcResponse> {
    const { instanceId } = params as { instanceId: string };
    this.runtime.interrupt(instanceId);
    return ok({ instanceId });
  }

  // ==================== Message Commands ====================

  private async handleMessageSend(params: unknown): Promise<RpcResponse> {
    const { instanceId, imageId, content } = params as {
      instanceId?: string;
      imageId?: string;
      content: string | UserContentPart[];
    };

    let targetInstanceId: string;

    if (instanceId) {
      // Direct agent reference
      targetInstanceId = instanceId;
    } else if (imageId) {
      // Auto-activate image: find or create agent
      const existingAgent = this.runtime
        .getAgents()
        .find((a) => a.imageId === imageId && a.lifecycle === "running");

      if (existingAgent) {
        targetInstanceId = existingAgent.instanceId;
        logger.debug("Using existing agent for message", {
          imageId,
          instanceId: targetInstanceId,
        });
      } else {
        // Create new agent for this image
        const agent = await this.runtime.createAgent({ imageId });
        targetInstanceId = agent.instanceId;
        logger.info("Auto-created agent for message", {
          imageId,
          instanceId: targetInstanceId,
        });
      }
    } else {
      return err(-32602, "Either instanceId or imageId is required");
    }

    await this.runtime.receive(targetInstanceId, content);
    return ok({ instanceId: targetInstanceId, imageId });
  }

  // ==================== Prototype Commands ====================

  private async handlePrototypeCreate(params: unknown): Promise<RpcResponse> {
    const { containerId, name, description, contextId, embody, customData } = params as {
      containerId: string;
      name: string;
      description?: string;
      contextId?: string;
      embody?: import("@agentxjs/core/persistence").Embodiment;
      customData?: Record<string, unknown>;
    };

    const repo = this.runtime.platform.prototypeRepository;
    if (!repo) {
      return err(-32000, "Prototype repository not available");
    }

    const now = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const record = {
      prototypeId: `proto_${now}_${random}`,
      containerId,
      name,
      description,
      contextId,
      embody,
      customData,
      createdAt: now,
      updatedAt: now,
    };

    await repo.savePrototype(record);
    return ok({ record });
  }

  private async handlePrototypeGet(params: unknown): Promise<RpcResponse> {
    const { prototypeId } = params as { prototypeId: string };
    const repo = this.runtime.platform.prototypeRepository;
    if (!repo) {
      return err(-32000, "Prototype repository not available");
    }

    const record = await repo.findPrototypeById(prototypeId);
    return ok({ record });
  }

  private async handlePrototypeList(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId?: string };
    const repo = this.runtime.platform.prototypeRepository;
    if (!repo) {
      return err(-32000, "Prototype repository not available");
    }

    const records = containerId
      ? await repo.findPrototypesByContainerId(containerId)
      : await repo.findAllPrototypes();

    return ok({ records });
  }

  private async handlePrototypeUpdate(params: unknown): Promise<RpcResponse> {
    const { prototypeId, updates } = params as {
      prototypeId: string;
      updates: {
        name?: string;
        description?: string;
        contextId?: string;
        embody?: import("@agentxjs/core/persistence").Embodiment;
        customData?: Record<string, unknown>;
      };
    };

    const repo = this.runtime.platform.prototypeRepository;
    if (!repo) {
      return err(-32000, "Prototype repository not available");
    }

    const existing = await repo.findPrototypeById(prototypeId);
    if (!existing) {
      return err(404, `Prototype not found: ${prototypeId}`);
    }

    const { embody: embodyUpdates, ...otherUpdates } = updates;
    const updated = {
      ...existing,
      ...otherUpdates,
      embody: embodyUpdates ? { ...existing.embody, ...embodyUpdates } : existing.embody,
      updatedAt: Date.now(),
    };

    await repo.savePrototype(updated);
    return ok({ record: updated });
  }

  private async handlePrototypeDelete(params: unknown): Promise<RpcResponse> {
    const { prototypeId } = params as { prototypeId: string };
    const repo = this.runtime.platform.prototypeRepository;
    if (!repo) {
      return err(-32000, "Prototype repository not available");
    }

    await repo.deletePrototype(prototypeId);
    return ok({ prototypeId });
  }

  // ==================== LLM Provider Commands ====================

  private async handleLLMCreate(params: unknown): Promise<RpcResponse> {
    const { containerId, name, vendor, protocol, apiKey, baseUrl, model } = params as {
      containerId: string;
      name: string;
      vendor: string;
      protocol: string;
      apiKey: string;
      baseUrl?: string;
      model?: string;
    };

    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    const { generateId } = await import("@deepracticex/id");
    const now = Date.now();
    const record = {
      id: generateId("llm"),
      containerId,
      name,
      vendor,
      protocol: protocol as "anthropic" | "openai",
      apiKey,
      baseUrl,
      model,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await repo.saveLLMProvider(record);
    return ok({ record });
  }

  private async handleLLMGet(params: unknown): Promise<RpcResponse> {
    const { id } = params as { id: string };
    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    const record = await repo.findLLMProviderById(id);
    return ok({ record });
  }

  private async handleLLMList(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId: string };
    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    const records = await repo.findLLMProvidersByContainerId(containerId);
    return ok({ records });
  }

  private async handleLLMUpdate(params: unknown): Promise<RpcResponse> {
    const { id, updates } = params as {
      id: string;
      updates: Record<string, unknown>;
    };
    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    const existing = await repo.findLLMProviderById(id);
    if (!existing) {
      return err(404, `LLM provider not found: ${id}`);
    }

    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      containerId: existing.containerId,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    await repo.saveLLMProvider(updated);
    return ok({ record: updated });
  }

  private async handleLLMDelete(params: unknown): Promise<RpcResponse> {
    const { id } = params as { id: string };
    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    await repo.deleteLLMProvider(id);
    return ok({ id });
  }

  private async handleLLMDefault(params: unknown): Promise<RpcResponse> {
    const { id, containerId } = params as { id?: string; containerId?: string };
    const repo = this.runtime.platform.llmProviderRepository;
    if (!repo) {
      return err(-32000, "LLM provider repository not available");
    }

    if (id) {
      // Set default
      await repo.setDefaultLLMProvider(id);
      return ok({ id });
    }
    if (containerId) {
      // Get default
      const record = await repo.findDefaultLLMProvider(containerId);
      return ok({ record });
    }
    return err(-32602, "Either id or containerId is required");
  }

  // ==================== Lifecycle ====================

  dispose(): void {
    logger.debug("CommandHandler disposed");
  }
}
