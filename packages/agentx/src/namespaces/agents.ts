/**
 * Agent namespace factories
 */

import type { RpcClient, RpcMethod } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type {
  AgentCreateResponse,
  AgentGetResponse,
  AgentListResponse,
  AgentNamespace,
  BaseResponse,
} from "../types";

/**
 * Create local agent namespace backed by embedded runtime
 */
export function createLocalAgents(runtime: AgentXRuntime): AgentNamespace {
  return {
    async create(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse> {
      // Reuse existing running agent for this image
      const existingAgent = runtime
        .getAgents()
        .find((a) => a.imageId === params.imageId && a.lifecycle === "running");

      if (existingAgent) {
        return {
          agentId: existingAgent.agentId,
          imageId: existingAgent.imageId,
          containerId: existingAgent.containerId,
          sessionId: existingAgent.sessionId,
          requestId: "",
        };
      }

      const agent = await runtime.createAgent({
        imageId: params.imageId,
        agentId: params.agentId,
      });

      return {
        agentId: agent.agentId,
        imageId: agent.imageId,
        containerId: agent.containerId,
        sessionId: agent.sessionId,
        requestId: "",
      };
    },

    async get(agentId: string): Promise<AgentGetResponse> {
      const agent = runtime.getAgent(agentId);
      return {
        agent: agent
          ? {
              agentId: agent.agentId,
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

    async list(containerId?: string): Promise<AgentListResponse> {
      const agents = containerId ? runtime.getAgentsByContainer(containerId) : runtime.getAgents();

      return {
        agents: agents.map((a) => ({
          agentId: a.agentId,
          imageId: a.imageId,
          containerId: a.containerId,
          sessionId: a.sessionId,
          lifecycle: a.lifecycle,
        })),
        requestId: "",
      };
    },

    async destroy(agentId: string): Promise<BaseResponse> {
      const agent = runtime.getAgent(agentId);
      if (agent) {
        await runtime.destroyAgent(agentId);
      }
      return { requestId: "" };
    },
  };
}

/**
 * Create remote agent namespace backed by RPC client
 */
export function createRemoteAgents(rpcClient: RpcClient): AgentNamespace {
  return {
    async create(params: { imageId: string; agentId?: string }): Promise<AgentCreateResponse> {
      // Agent creation via image.run RPC
      const result = await rpcClient.call<AgentCreateResponse>("image.run" as RpcMethod, {
        imageId: params.imageId,
        agentId: params.agentId,
      });
      return { ...result, requestId: "" };
    },

    async get(agentId: string): Promise<AgentGetResponse> {
      const result = await rpcClient.call<AgentGetResponse>("agent.get", { agentId });
      return { ...result, requestId: "" };
    },

    async list(containerId?: string): Promise<AgentListResponse> {
      const result = await rpcClient.call<AgentListResponse>("agent.list", { containerId });
      return { ...result, requestId: "" };
    },

    async destroy(agentId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("agent.destroy", { agentId });
      return { ...result, requestId: "" };
    },
  };
}
