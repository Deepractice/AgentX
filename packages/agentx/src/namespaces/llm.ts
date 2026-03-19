/**
 * LLM Provider namespace — type-safe wrapper over rpc()
 */

import type {
  BaseResponse,
  LLMNamespace,
  LLMProviderCreateResponse,
  LLMProviderDefaultResponse,
  LLMProviderGetResponse,
  LLMProviderListResponse,
  LLMProviderUpdateResponse,
} from "../types";

type RpcFn = <T = unknown>(method: string, params?: unknown) => Promise<T>;

export function createLLM(rpc: RpcFn): LLMNamespace {
  return {
    async create(params): Promise<LLMProviderCreateResponse> {
      return rpc<LLMProviderCreateResponse>("llm.create", params);
    },

    async get(id: string): Promise<LLMProviderGetResponse> {
      return rpc<LLMProviderGetResponse>("llm.get", { id });
    },

    async list(): Promise<LLMProviderListResponse> {
      return rpc<LLMProviderListResponse>("llm.list", {});
    },

    async update(id, updates): Promise<LLMProviderUpdateResponse> {
      return rpc<LLMProviderUpdateResponse>("llm.update", { id, updates });
    },

    async delete(id: string): Promise<BaseResponse> {
      return rpc<BaseResponse>("llm.delete", { id });
    },

    async setDefault(id: string): Promise<BaseResponse> {
      return rpc<BaseResponse>("llm.default", { id });
    },

    async getDefault(): Promise<LLMProviderDefaultResponse> {
      return rpc<LLMProviderDefaultResponse>("llm.default", {});
    },
  };
}
