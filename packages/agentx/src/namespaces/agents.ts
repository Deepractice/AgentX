/**
 * Agent namespace factories
 */

import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type {
  BaseResponse,
  InstanceCreateResponse,
  InstanceGetResponse,
  InstanceListResponse,
  InstanceNamespace,
} from "../types";

/**
 * Create local agent namespace backed by embedded runtime
 */
export function createLocalInstances(runtime: AgentXRuntime): InstanceNamespace {
  return {
    async create(params: {
      imageId: string;
      instanceId?: string;
    }): Promise<InstanceCreateResponse> {
      // Reuse existing running agent for this image
      const existingAgent = runtime
        .getAgents()
        .find((a) => a.imageId === params.imageId && a.lifecycle === "running");

      if (existingAgent) {
        return {
          instanceId: existingAgent.instanceId,
          imageId: existingAgent.imageId,
          containerId: existingAgent.containerId,
          sessionId: existingAgent.sessionId,
          requestId: "",
        };
      }

      const agent = await runtime.createAgent({
        imageId: params.imageId,
        instanceId: params.instanceId,
      });

      return {
        instanceId: agent.instanceId,
        imageId: agent.imageId,
        containerId: agent.containerId,
        sessionId: agent.sessionId,
        requestId: "",
      };
    },

    async get(instanceId: string): Promise<InstanceGetResponse> {
      const agent = runtime.getAgent(instanceId);
      return {
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
        requestId: "",
      };
    },

    async list(): Promise<InstanceListResponse> {
      const agents = runtime.getAgents();

      return {
        agents: agents.map((a) => ({
          instanceId: a.instanceId,
          imageId: a.imageId,
          containerId: a.containerId,
          sessionId: a.sessionId,
          lifecycle: a.lifecycle,
        })),
        requestId: "",
      };
    },

    async destroy(instanceId: string): Promise<BaseResponse> {
      const agent = runtime.getAgent(instanceId);
      if (agent) {
        await runtime.destroyAgent(instanceId);
      }
      return { requestId: "" };
    },
  };
}

/**
 * Create remote agent namespace backed by RPC client
 */
export function createRemoteInstances(rpcClient: RpcClient): InstanceNamespace {
  return {
    async create(params: {
      imageId: string;
      instanceId?: string;
    }): Promise<InstanceCreateResponse> {
      // Agent creation via image.run RPC
      const result = await rpcClient.call<InstanceCreateResponse>("image.run", {
        imageId: params.imageId,
        instanceId: params.instanceId,
      });
      return { ...result, requestId: "" };
    },

    async get(instanceId: string): Promise<InstanceGetResponse> {
      const result = await rpcClient.call<InstanceGetResponse>("instance.get", { instanceId });
      return { ...result, requestId: "" };
    },

    async list(): Promise<InstanceListResponse> {
      const result = await rpcClient.call<InstanceListResponse>("instance.list", {});
      return { ...result, requestId: "" };
    },

    async destroy(instanceId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("instance.destroy", { instanceId });
      return { ...result, requestId: "" };
    },
  };
}
