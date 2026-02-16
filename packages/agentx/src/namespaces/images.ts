/**
 * Image namespace factories
 */

import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type {
  BaseResponse,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ImageNamespace,
  ImageUpdateResponse,
} from "../types";

/**
 * Create local image namespace backed by embedded runtime
 */
export function createLocalImages(platform: AgentXPlatform): ImageNamespace {
  return {
    async create(params: {
      containerId: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
      mcpServers?: Record<string, unknown>;
      customData?: Record<string, unknown>;
    }): Promise<ImageCreateResponse> {
      const { imageRepository, sessionRepository } = platform;
      const { createImage } = await import("@agentxjs/core/image");

      const image = await createImage(
        {
          containerId: params.containerId,
          name: params.name,
          description: params.description,
          systemPrompt: params.systemPrompt,
          mcpServers: params.mcpServers as any,
          customData: params.customData,
        },
        { imageRepository, sessionRepository }
      );

      return {
        record: image.toRecord(),
        __subscriptions: [image.sessionId],
        requestId: "",
      };
    },

    async get(imageId: string): Promise<ImageGetResponse> {
      const record = await platform.imageRepository.findImageById(imageId);
      return {
        record,
        __subscriptions: record?.sessionId ? [record.sessionId] : undefined,
        requestId: "",
      };
    },

    async list(containerId?: string): Promise<ImageListResponse> {
      const records = containerId
        ? await platform.imageRepository.findImagesByContainerId(containerId)
        : await platform.imageRepository.findAllImages();

      return {
        records,
        __subscriptions: records.map((r) => r.sessionId),
        requestId: "",
      };
    },

    async update(
      imageId: string,
      updates: {
        name?: string;
        description?: string;
        customData?: Record<string, unknown>;
      }
    ): Promise<ImageUpdateResponse> {
      const { loadImage } = await import("@agentxjs/core/image");
      const { imageRepository, sessionRepository } = platform;

      const image = await loadImage(imageId, { imageRepository, sessionRepository });
      if (!image) {
        throw new Error(`Image not found: ${imageId}`);
      }

      const updated = await image.update(updates);
      return { record: updated.toRecord(), requestId: "" };
    },

    async delete(imageId: string): Promise<BaseResponse> {
      const { loadImage } = await import("@agentxjs/core/image");
      const { imageRepository, sessionRepository } = platform;

      const image = await loadImage(imageId, { imageRepository, sessionRepository });
      if (image) {
        await image.delete();
      }

      return { requestId: "" };
    },
  };
}

/**
 * Create remote image namespace backed by RPC client
 */
export function createRemoteImages(
  rpcClient: RpcClient,
  subscribeFn: (sessionId: string) => void
): ImageNamespace {
  return {
    async create(params: {
      containerId: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
      mcpServers?: Record<string, unknown>;
      customData?: Record<string, unknown>;
    }): Promise<ImageCreateResponse> {
      const result = await rpcClient.call<ImageCreateResponse>("image.create", params);

      // Auto subscribe to session events
      if (result.__subscriptions) {
        for (const sessionId of result.__subscriptions) {
          subscribeFn(sessionId);
        }
      }

      return { ...result, requestId: "" };
    },

    async get(imageId: string): Promise<ImageGetResponse> {
      const result = await rpcClient.call<ImageGetResponse>("image.get", { imageId });

      // Auto subscribe
      if (result.__subscriptions) {
        for (const sessionId of result.__subscriptions) {
          subscribeFn(sessionId);
        }
      }

      return { ...result, requestId: "" };
    },

    async list(containerId?: string): Promise<ImageListResponse> {
      const result = await rpcClient.call<ImageListResponse>("image.list", { containerId });

      // Auto subscribe
      if (result.__subscriptions) {
        for (const sessionId of result.__subscriptions) {
          subscribeFn(sessionId);
        }
      }

      return { ...result, requestId: "" };
    },

    async update(
      imageId: string,
      updates: {
        name?: string;
        description?: string;
        customData?: Record<string, unknown>;
      }
    ): Promise<ImageUpdateResponse> {
      const result = await rpcClient.call<ImageUpdateResponse>("image.update", {
        imageId,
        updates,
      });
      return { ...result, requestId: "" };
    },

    async delete(imageId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("image.delete", { imageId });
      return { ...result, requestId: "" };
    },
  };
}
