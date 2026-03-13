/**
 * Session namespace factories (messaging)
 */

import type { Message, UserContentPart } from "@agentxjs/core/agent";
import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type { BaseResponse, InstanceInfo, MessageSendResponse, SessionNamespace } from "../types";

/**
 * Create local session namespace backed by embedded runtime
 */
export function createLocalSessions(runtime: AgentXRuntime): SessionNamespace {
  return {
    async send(instanceId: string, content: string | unknown[]): Promise<MessageSendResponse> {
      await runtime.receive(instanceId, content as string | UserContentPart[]);
      return { instanceId, requestId: "" };
    },

    async interrupt(instanceId: string): Promise<BaseResponse> {
      runtime.interrupt(instanceId);
      return { requestId: "" };
    },

    async getMessages(instanceId: string): Promise<Message[]> {
      const agent = runtime.getAgent(instanceId);
      if (!agent) return [];
      return runtime.platform.sessionRepository.getMessages(agent.sessionId);
    },
  };
}

/**
 * Create remote session namespace backed by RPC client
 */
export function createRemoteSessions(rpcClient: RpcClient): SessionNamespace {
  return {
    async send(instanceId: string, content: string | unknown[]): Promise<MessageSendResponse> {
      const result = await rpcClient.call<MessageSendResponse>("message.send", {
        instanceId,
        content,
      });
      return { ...result, requestId: "" };
    },

    async interrupt(instanceId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("instance.interrupt", { instanceId });
      return { ...result, requestId: "" };
    },

    async getMessages(instanceId: string): Promise<Message[]> {
      const agentRes = await rpcClient.call<{ agent: InstanceInfo | null }>("instance.get", {
        instanceId,
      });
      if (!agentRes.agent) return [];
      const msgRes = await rpcClient.call<{ messages: Message[] }>("image.messages", {
        imageId: agentRes.agent.imageId,
      });
      return msgRes.messages ?? [];
    },
  };
}
