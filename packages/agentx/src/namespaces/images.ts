/**
 * Image namespace factories
 */

import type { Message } from "@agentxjs/core/agent";
import { DEFAULT_CONTAINER_ID } from "@agentxjs/core/container";
import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type {
  AgentConfig,
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
    async create(params: AgentConfig): Promise<ImageCreateResponse> {
      const { imageRepository, sessionRepository } = platform;
      const { createImage } = await import("@agentxjs/core/image");

      const { model, systemPrompt, mcpServers, ...rest } = params;
      const embody =
        model || systemPrompt || mcpServers
          ? { model, systemPrompt, mcpServers: mcpServers as any }
          : undefined;

      const image = await createImage(
        {
          containerId: DEFAULT_CONTAINER_ID,
          ...rest,
          embody,
        },
        { imageRepository, sessionRepository }
      );

      return {
        record: image.toRecord(),
        requestId: "",
      };
    },

    async get(imageId: string): Promise<ImageGetResponse> {
      const record = await platform.imageRepository.findImageById(imageId);
      return {
        record,
        requestId: "",
      };
    },

    async list(): Promise<ImageListResponse> {
      const records = await platform.imageRepository.findAllImages();

      return {
        records,
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

    async getMessages(imageId: string): Promise<Message[]> {
      const imageRecord = await platform.imageRepository.findImageById(imageId);
      if (!imageRecord) return [];
      return platform.sessionRepository.getMessages(imageRecord.sessionId);
    },
  };
}

/**
 * Create remote image namespace backed by RPC client
 */
export function createRemoteImages(rpcClient: RpcClient): ImageNamespace {
  return {
    async create(params: AgentConfig): Promise<ImageCreateResponse> {
      const result = await rpcClient.call<ImageCreateResponse>("image.create", {
        ...params,
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },

    async get(imageId: string): Promise<ImageGetResponse> {
      const result = await rpcClient.call<ImageGetResponse>("image.get", { imageId });
      return { ...result, requestId: "" };
    },

    async list(): Promise<ImageListResponse> {
      const result = await rpcClient.call<ImageListResponse>("image.list", {});
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

    async getMessages(imageId: string): Promise<Message[]> {
      const result = await rpcClient.call<{ messages: Message[] }>("image.messages", { imageId });
      return result.messages ?? [];
    },
  };
}
