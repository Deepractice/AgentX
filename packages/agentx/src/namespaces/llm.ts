/**
 * LLM Provider namespace factories
 */

import { DEFAULT_CONTAINER_ID } from "@agentxjs/core/container";
import type { RpcClient } from "@agentxjs/core/network";
import type { LLMProviderRecord } from "@agentxjs/core/persistence";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import { generateId } from "@deepracticex/id";
import type {
  BaseResponse,
  LLMNamespace,
  LLMProviderCreateResponse,
  LLMProviderDefaultResponse,
  LLMProviderGetResponse,
  LLMProviderListResponse,
  LLMProviderUpdateResponse,
} from "../types";

/**
 * Create local LLM namespace backed by platform repository
 */
export function createLocalLLM(platform: AgentXPlatform): LLMNamespace {
  const repo = platform.llmProviderRepository;
  if (!repo) {
    throw new Error("LLM provider repository not available on this platform");
  }

  return {
    async create(params): Promise<LLMProviderCreateResponse> {
      const now = Date.now();
      const record: LLMProviderRecord = {
        id: generateId("llm"),
        containerId: DEFAULT_CONTAINER_ID,
        name: params.name,
        vendor: params.vendor,
        protocol: params.protocol,
        apiKey: params.apiKey,
        baseUrl: params.baseUrl,
        model: params.model,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      };

      await repo.saveLLMProvider(record);
      return { record, requestId: "" };
    },

    async get(id: string): Promise<LLMProviderGetResponse> {
      const record = await repo.findLLMProviderById(id);
      return { record, requestId: "" };
    },

    async list(): Promise<LLMProviderListResponse> {
      const records = await repo.findLLMProvidersByContainerId(DEFAULT_CONTAINER_ID);
      return { records, requestId: "" };
    },

    async update(id, updates): Promise<LLMProviderUpdateResponse> {
      const existing = await repo.findLLMProviderById(id);
      if (!existing) {
        throw new Error(`LLM provider not found: ${id}`);
      }

      const updated: LLMProviderRecord = {
        ...existing,
        ...updates,
        id: existing.id,
        containerId: existing.containerId,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      };

      await repo.saveLLMProvider(updated);
      return { record: updated, requestId: "" };
    },

    async delete(id: string): Promise<BaseResponse> {
      await repo.deleteLLMProvider(id);
      return { requestId: "" };
    },

    async setDefault(id: string): Promise<BaseResponse> {
      await repo.setDefaultLLMProvider(id);
      return { requestId: "" };
    },

    async getDefault(): Promise<LLMProviderDefaultResponse> {
      const record = await repo.findDefaultLLMProvider(DEFAULT_CONTAINER_ID);
      return { record, requestId: "" };
    },
  };
}

/**
 * Create remote LLM namespace backed by RPC client
 */
export function createRemoteLLM(rpcClient: RpcClient): LLMNamespace {
  return {
    async create(params): Promise<LLMProviderCreateResponse> {
      const result = await rpcClient.call<LLMProviderCreateResponse>("llm.create", {
        ...params,
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },

    async get(id: string): Promise<LLMProviderGetResponse> {
      const result = await rpcClient.call<LLMProviderGetResponse>("llm.get", { id });
      return { ...result, requestId: "" };
    },

    async list(): Promise<LLMProviderListResponse> {
      const result = await rpcClient.call<LLMProviderListResponse>("llm.list", {
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },

    async update(id, updates): Promise<LLMProviderUpdateResponse> {
      const result = await rpcClient.call<LLMProviderUpdateResponse>("llm.update", {
        id,
        updates,
      });
      return { ...result, requestId: "" };
    },

    async delete(id: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("llm.delete", { id });
      return { ...result, requestId: "" };
    },

    async setDefault(id: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("llm.default", { id });
      return { ...result, requestId: "" };
    },

    async getDefault(): Promise<LLMProviderDefaultResponse> {
      const result = await rpcClient.call<LLMProviderDefaultResponse>("llm.default", {
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },
  };
}
