/**
 * Image RPC Handlers
 */

import { type RpcHandlerRegistry, err, ok } from "@deepracticex/rpc";

export function registerImageHandlers(registry: RpcHandlerRegistry): void {
  registry.register("image.create", "Create a new agent image", async (runtime, params) => {
    const {
      name,
      description,
      roleId,
      model,
      systemPrompt,
      mcpServers,
      thinking,
      providerOptions,
      customData,
    } = params as {
      name?: string;
      description?: string;
      roleId?: string;
      model?: string;
      systemPrompt?: string;
      mcpServers?: Record<string, unknown>;
      thinking?: string;
      providerOptions?: Record<string, unknown>;
      customData?: Record<string, unknown>;
    };

    const { imageRepository, sessionRepository } = runtime.platform;
    const { createImage } = await import("@agentxjs/core/image");

    const image = await createImage(
      {
        containerId: runtime.platform.containerId,
        name,
        description,
        roleId,
        model,
        systemPrompt,
        mcpServers: mcpServers as any,
        thinking: thinking as any,
        providerOptions,
        customData,
      },
      { imageRepository, sessionRepository }
    );

    return ok({ record: image.toRecord() });
  });

  registry.register("image.get", "Get an agent image by ID", async (runtime, params) => {
    const { imageId } = params as { imageId: string };
    const record = await runtime.platform.imageRepository.findImageById(imageId);
    return ok({ record });
  });

  registry.register("image.list", "List all agent images", async (runtime, params) => {
    const { containerId } = params as { containerId?: string };
    const records = containerId
      ? await runtime.platform.imageRepository.findImagesByContainerId(containerId)
      : await runtime.platform.imageRepository.findAllImages();
    return ok({ records });
  });

  registry.register("image.delete", "Delete an agent image", async (runtime, params) => {
    const { imageId } = params as { imageId: string };
    const { loadImage } = await import("@agentxjs/core/image");
    const { imageRepository, sessionRepository } = runtime.platform;
    const image = await loadImage(imageId, { imageRepository, sessionRepository });
    if (image) await image.delete();
    return ok({ imageId });
  });

  registry.register("image.run", "Start an agent from an image", async (runtime, params) => {
    const { imageId, instanceId: requestedInstanceId } = params as {
      imageId: string;
      instanceId?: string;
    };

    const existingAgent = runtime
      .getAgents()
      .find((a) => a.imageId === imageId && a.lifecycle === "running");

    if (existingAgent) {
      return ok({
        imageId,
        instanceId: existingAgent.instanceId,
        sessionId: existingAgent.sessionId,
        containerId: existingAgent.containerId,
        reused: true,
      });
    }

    const agent = await runtime.createAgent({ imageId, instanceId: requestedInstanceId });
    return ok({
      imageId,
      instanceId: agent.instanceId,
      sessionId: agent.sessionId,
      containerId: agent.containerId,
      reused: false,
    });
  });

  registry.register("image.stop", "Stop a running agent by image ID", async (runtime, params) => {
    const { imageId } = params as { imageId: string };
    const agent = runtime
      .getAgents()
      .find((a) => a.imageId === imageId && a.lifecycle === "running");
    if (agent) await runtime.stopAgent(agent.instanceId);
    return ok({ imageId });
  });

  registry.register(
    "image.update",
    "Update an agent image configuration",
    async (runtime, params) => {
      const { imageId, updates } = params as {
        imageId: string;
        updates: {
          name?: string;
          description?: string;
          model?: string;
          systemPrompt?: string;
          mcpServers?: Record<string, unknown>;
          thinking?: string;
          providerOptions?: Record<string, unknown>;
          customData?: Record<string, unknown>;
        };
      };

      const imageRecord = await runtime.platform.imageRepository.findImageById(imageId);
      if (!imageRecord) return err(404, `Image not found: ${imageId}`);

      const updatedRecord = {
        ...imageRecord,
        ...updates,
        updatedAt: Date.now(),
      };

      await runtime.platform.imageRepository.saveImage(updatedRecord);

      // If runtime config changed, restart the running agent
      const { model, systemPrompt, mcpServers, thinking, providerOptions } = updates;
      const hasRuntimeChanges =
        model !== undefined ||
        systemPrompt !== undefined ||
        mcpServers !== undefined ||
        thinking !== undefined ||
        providerOptions !== undefined;

      if (hasRuntimeChanges) {
        const runningAgent = runtime
          .getAgents()
          .find((a) => a.imageId === imageId && a.lifecycle === "running");
        if (runningAgent) {
          await runtime.destroyAgent(runningAgent.instanceId);
          await runtime.createAgent({ imageId });
        }
      }
      return ok({ record: updatedRecord });
    }
  );

  registry.register(
    "image.messages",
    "Get all messages for an agent image",
    async (runtime, params) => {
      const { imageId } = params as { imageId: string };
      const imageRecord = await runtime.platform.imageRepository.findImageById(imageId);
      if (!imageRecord) return err(404, `Image not found: ${imageId}`);
      const messages = await runtime.platform.sessionRepository.getMessages(imageRecord.sessionId);
      return ok({ imageId, messages });
    }
  );
}
