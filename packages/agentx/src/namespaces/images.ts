/**
 * Image namespace — type-safe wrapper over rpc()
 */

import type { Message } from "@agentxjs/core/agent";
import type {
  AgentConfig,
  BaseResponse,
  ImageCreateResponse,
  ImageGetResponse,
  ImageListResponse,
  ImageUpdateResponse,
  InstanceCreateResponse,
} from "../types";

type RpcFn = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export function createImages(rpc: RpcFn) {
  return {
    async create(params: AgentConfig): Promise<ImageCreateResponse> {
      return rpc<ImageCreateResponse>("image.create", params);
    },

    async get(imageId: string): Promise<ImageGetResponse> {
      return rpc<ImageGetResponse>("image.get", { imageId });
    },

    async list(): Promise<ImageListResponse> {
      return rpc<ImageListResponse>("image.list", {});
    },

    async update(
      imageId: string,
      updates: {
        name?: string;
        description?: string;
        customData?: Record<string, unknown>;
      }
    ): Promise<ImageUpdateResponse> {
      return rpc<ImageUpdateResponse>("image.update", { imageId, updates });
    },

    async delete(imageId: string): Promise<BaseResponse> {
      return rpc<BaseResponse>("image.delete", { imageId });
    },

    async getMessages(imageId: string): Promise<Message[]> {
      const result = await rpc<{ imageId: string; messages: Message[] }>("image.messages", {
        imageId,
      });
      return result.messages ?? [];
    },

    async run(imageId: string): Promise<InstanceCreateResponse> {
      return rpc<InstanceCreateResponse>("image.run", { imageId });
    },

    async stop(imageId: string): Promise<BaseResponse> {
      return rpc<BaseResponse>("image.stop", { imageId });
    },
  };
}
