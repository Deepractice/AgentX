/**
 * Prototype namespace factories
 */

import { DEFAULT_CONTAINER_ID } from "@agentxjs/core/container";
import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type {
  BaseResponse,
  PrototypeCreateResponse,
  PrototypeGetResponse,
  PrototypeListResponse,
  PrototypeNamespace,
  PrototypeUpdateResponse,
} from "../types";

/**
 * Create local prototype namespace backed by embedded runtime
 */
export function createLocalPrototypes(platform: AgentXPlatform): PrototypeNamespace {
  return {
    async create(params): Promise<PrototypeCreateResponse> {
      const repo = platform.prototypeRepository;
      if (!repo) {
        throw new Error("Prototype repository not available");
      }

      const now = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const record = {
        prototypeId: `proto_${now}_${random}`,
        containerId: DEFAULT_CONTAINER_ID,
        name: params.name,
        description: params.description,
        contextId: params.contextId,
        embody: params.embody,
        customData: params.customData,
        createdAt: now,
        updatedAt: now,
      };

      await repo.savePrototype(record);
      return { record, requestId: "" };
    },

    async get(prototypeId: string): Promise<PrototypeGetResponse> {
      const repo = platform.prototypeRepository;
      if (!repo) {
        throw new Error("Prototype repository not available");
      }

      const record = await repo.findPrototypeById(prototypeId);
      return { record, requestId: "" };
    },

    async list(): Promise<PrototypeListResponse> {
      const repo = platform.prototypeRepository;
      if (!repo) {
        throw new Error("Prototype repository not available");
      }

      const records = await repo.findPrototypesByContainerId(DEFAULT_CONTAINER_ID);

      return { records, requestId: "" };
    },

    async update(prototypeId, updates): Promise<PrototypeUpdateResponse> {
      const repo = platform.prototypeRepository;
      if (!repo) {
        throw new Error("Prototype repository not available");
      }

      const existing = await repo.findPrototypeById(prototypeId);
      if (!existing) {
        throw new Error(`Prototype not found: ${prototypeId}`);
      }

      const { embody: embodyUpdates, ...otherUpdates } = updates;
      const updatedRecord = {
        ...existing,
        ...otherUpdates,
        embody: embodyUpdates ? { ...existing.embody, ...embodyUpdates } : existing.embody,
        updatedAt: Date.now(),
      };

      await repo.savePrototype(updatedRecord);
      return { record: updatedRecord, requestId: "" };
    },

    async delete(prototypeId: string): Promise<BaseResponse> {
      const repo = platform.prototypeRepository;
      if (!repo) {
        throw new Error("Prototype repository not available");
      }

      await repo.deletePrototype(prototypeId);
      return { requestId: "" };
    },
  };
}

/**
 * Create remote prototype namespace backed by RPC client
 */
export function createRemotePrototypes(rpcClient: RpcClient): PrototypeNamespace {
  return {
    async create(params): Promise<PrototypeCreateResponse> {
      const result = await rpcClient.call<PrototypeCreateResponse>("prototype.create", {
        ...params,
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },

    async get(prototypeId: string): Promise<PrototypeGetResponse> {
      const result = await rpcClient.call<PrototypeGetResponse>("prototype.get", { prototypeId });
      return { ...result, requestId: "" };
    },

    async list(): Promise<PrototypeListResponse> {
      const result = await rpcClient.call<PrototypeListResponse>("prototype.list", {
        containerId: DEFAULT_CONTAINER_ID,
      });
      return { ...result, requestId: "" };
    },

    async update(prototypeId, updates): Promise<PrototypeUpdateResponse> {
      const result = await rpcClient.call<PrototypeUpdateResponse>("prototype.update", {
        prototypeId,
        updates,
      });
      return { ...result, requestId: "" };
    },

    async delete(prototypeId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("prototype.delete", { prototypeId });
      return { ...result, requestId: "" };
    },
  };
}
