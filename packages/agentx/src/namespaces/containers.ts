/**
 * Container namespace factories
 */

import type { AgentXPlatform } from "@agentxjs/core/runtime";
import type { RpcClient } from "@agentxjs/core/network";
import type {
  ContainerNamespace,
  ContainerCreateResponse,
  ContainerGetResponse,
  ContainerListResponse,
} from "../types";

/**
 * Create local container namespace backed by embedded runtime
 */
export function createLocalContainers(platform: AgentXPlatform): ContainerNamespace {
  return {
    async create(containerId: string): Promise<ContainerCreateResponse> {
      const { getOrCreateContainer } = await import("@agentxjs/core/container");
      const { containerRepository, imageRepository, sessionRepository } = platform;

      const container = await getOrCreateContainer(containerId, {
        containerRepository,
        imageRepository,
        sessionRepository,
      });

      return { containerId: container.containerId, requestId: "" };
    },

    async get(containerId: string): Promise<ContainerGetResponse> {
      const exists = await platform.containerRepository.containerExists(containerId);
      return { containerId, exists, requestId: "" };
    },

    async list(): Promise<ContainerListResponse> {
      const containers = await platform.containerRepository.findAllContainers();
      return { containerIds: containers.map((c) => c.containerId), requestId: "" };
    },
  };
}

/**
 * Create remote container namespace backed by RPC client
 */
export function createRemoteContainers(rpcClient: RpcClient): ContainerNamespace {
  return {
    async create(containerId: string): Promise<ContainerCreateResponse> {
      const result = await rpcClient.call<ContainerCreateResponse>("container.create", {
        containerId,
      });
      return { ...result, requestId: "" };
    },

    async get(containerId: string): Promise<ContainerGetResponse> {
      const result = await rpcClient.call<ContainerGetResponse>("container.get", {
        containerId,
      });
      return { ...result, requestId: "" };
    },

    async list(): Promise<ContainerListResponse> {
      const result = await rpcClient.call<ContainerListResponse>("container.list", {});
      return { ...result, requestId: "" };
    },
  };
}
