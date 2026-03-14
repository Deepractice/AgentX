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

    async truncateAfter(instanceId: string, messageId: string): Promise<BaseResponse> {
      const agent = runtime.getAgent(instanceId);
      if (!agent) throw new Error(`Agent not found: ${instanceId}`);
      const messages = await runtime.platform.sessionRepository.getMessages(agent.sessionId);
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx === -1) throw new Error(`Message not found: ${messageId}`);
      const kept = messages.slice(0, idx + 1);
      await runtime.platform.sessionRepository.clearMessages(agent.sessionId);
      for (const msg of kept) {
        await runtime.platform.sessionRepository.addMessage(agent.sessionId, msg);
      }
      return { requestId: "" };
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

    async truncateAfter(instanceId: string, messageId: string): Promise<BaseResponse> {
      await rpcClient.call("message.truncateAfter", { instanceId, messageId });
      return { requestId: "" };
    },
  };
}
