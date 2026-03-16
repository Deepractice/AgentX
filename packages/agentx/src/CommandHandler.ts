/**
 * CommandHandler - Handles JSON-RPC requests directly
 *
 * No longer uses EventBus for request/response. Instead:
 * - Receives RPC requests directly
 * - Returns RPC responses directly
 * - EventBus is only used for stream events (notifications)
 */

import type { UserContentPart } from "@agentxjs/core/agent";
import { DEFAULT_CONTAINER_ID } from "@agentxjs/core/container";
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
        case "message.truncateAfter":
          return await this.handleMessageTruncateAfter(params);

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

  // ==================== Image Commands ====================

  private async handleImageCreate(params: unknown): Promise<RpcResponse> {
    const {
      containerId: _cid,
      name,
      description,
      contextId,
      model,
      systemPrompt,
      mcpServers,
      customData,
    } = params as {
      containerId?: string;
      name?: string;
      description?: string;
      contextId?: string;
      model?: string;
      systemPrompt?: string;
      mcpServers?: Record<string, unknown>;
      customData?: Record<string, unknown>;
    };

    const { imageRepository, sessionRepository } = this.runtime.platform;
    const { createImage } = await import("@agentxjs/core/image");

    const embody =
      model || systemPrompt || mcpServers
        ? ({ model, systemPrompt, mcpServers } as import("@agentxjs/core/persistence").Embodiment)
        : undefined;

    const image = await createImage(
      { containerId: DEFAULT_CONTAINER_ID, name, description, contextId, embody, customData },
      { imageRepository, sessionRepository }
    );

    return ok({
      record: image.toRecord(),
    });
  }

  private async handleImageGet(params: unknown): Promise<RpcResponse> {
    const { imageId } = params as { imageId: string };
    const record = await this.runtime.platform.imageRepository.findImageById(imageId);
    return ok({
      record,
    });
  }

  private async handleImageList(params: unknown): Promise<RpcResponse> {
    const { containerId } = params as { containerId?: string };
    const records = containerId
      ? await this.runtime.platform.imageRepository.findImagesByContainerId(containerId)
      : await this.runtime.platform.imageRepository.findAllImages();

    return ok({
      records,
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
        model?: string;
        systemPrompt?: string;
        mcpServers?: Record<string, unknown>;
        customData?: Record<string, unknown>;
      };
    };

    // Get existing image
    const imageRecord = await this.runtime.platform.imageRepository.findImageById(imageId);
    if (!imageRecord) {
      return err(404, `Image not found: ${imageId}`);
    }

    // Extract embody fields from flat updates
    const { model, systemPrompt, mcpServers, ...otherUpdates } = updates;
    const embodyUpdates =
      model !== undefined || systemPrompt !== undefined || mcpServers !== undefined
        ? ({
            ...imageRecord.embody,
            model,
            systemPrompt,
            mcpServers,
          } as import("@agentxjs/core/persistence").Embodiment)
        : imageRecord.embody;

    const updatedRecord = {
      ...imageRecord,
      ...otherUpdates,
      embody: embodyUpdates,
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

  /**
   * Resolve instanceId from either instanceId or imageId.
   * With imageId, finds existing agent or auto-creates one.
   */
  private async resolveInstanceId(params: {
    instanceId?: string;
    imageId?: string;
  }): Promise<string> {
    const { instanceId, imageId } = params;

    if (instanceId) {
      // Check if agent exists, if not try imageId fallback
      const agent = this.runtime.getAgent(instanceId);
      if (agent) return instanceId;
      // Agent gone (server restart?) — try to find by imageId from stored agents
    }

    if (imageId) {
      const existingAgent = this.runtime
        .getAgents()
        .find((a) => a.imageId === imageId && a.lifecycle === "running");

      if (existingAgent) {
        return existingAgent.instanceId;
      }

      // Auto-create agent for this image
      const agent = await this.runtime.createAgent({ imageId });
      logger.info("Auto-created agent", { imageId, instanceId: agent.instanceId });
      return agent.instanceId;
    }

    throw new Error("Either instanceId or imageId is required");
  }

  private async handleAgentInterrupt(params: unknown): Promise<RpcResponse> {
    const { instanceId, imageId } = params as { instanceId?: string; imageId?: string };
    const resolved = await this.resolveInstanceId({ instanceId, imageId });
    this.runtime.interrupt(resolved);
    return ok({ instanceId: resolved });
  }

  // ==================== Message Commands ====================

  private async handleMessageSend(params: unknown): Promise<RpcResponse> {
    const { instanceId, imageId, content } = params as {
      instanceId?: string;
      imageId?: string;
      content: string | UserContentPart[];
    };

    const resolved = await this.resolveInstanceId({ instanceId, imageId });
    await this.runtime.receive(resolved, content);
    return ok({ instanceId: resolved, imageId });
  }

  private async handleMessageTruncateAfter(params: unknown): Promise<RpcResponse> {
    const { instanceId, imageId, messageId } = params as {
      instanceId?: string;
      imageId?: string;
      messageId: string;
    };

    if (!messageId) {
      return err(-32602, "messageId is required");
    }

    const resolved = await this.resolveInstanceId({ instanceId, imageId });
    const agent = this.runtime.getAgent(resolved);
    if (!agent) {
      return err(-32602, `Agent not found: ${resolved}`);
    }

    const { sessionRepository } = this.runtime.platform;

    // Get messages, find the target, truncate
    const messages = await sessionRepository.getMessages(agent.sessionId);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx === -1) {
      return err(-32602, `Message not found: ${messageId}`);
    }

    // Keep messages up to and including messageId
    const kept = messages.slice(0, idx + 1);
    await sessionRepository.clearMessages(agent.sessionId);
    for (const msg of kept) {
      await sessionRepository.addMessage(agent.sessionId, msg);
    }

    return ok({ truncatedCount: messages.length - kept.length });
  }

  // ==================== LLM Provider Commands ====================

  private async handleLLMCreate(params: unknown): Promise<RpcResponse> {
    const {
      containerId: _cid,
      name,
      vendor,
      protocol,
      apiKey,
      baseUrl,
      model,
    } = params as {
      containerId?: string;
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
      containerId: DEFAULT_CONTAINER_ID,
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
