/**
 * Session namespace factories (messaging)
 */

import type { Message, UserContentPart } from "@agentxjs/core/agent";
import type { RpcClient } from "@agentxjs/core/network";
import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type { AgentInfo, BaseResponse, MessageSendResponse, SessionNamespace } from "../types";

/**
 * Create local session namespace backed by embedded runtime
 */
export function createLocalSessions(runtime: AgentXRuntime): SessionNamespace {
  return {
    async send(agentId: string, content: string | unknown[]): Promise<MessageSendResponse> {
      await runtime.receive(agentId, content as string | UserContentPart[]);
      return { agentId, requestId: "" };
    },

    async interrupt(agentId: string): Promise<BaseResponse> {
      runtime.interrupt(agentId);
      return { requestId: "" };
    },

    async getMessages(agentId: string): Promise<Message[]> {
      const agent = runtime.getAgent(agentId);
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
    async send(agentId: string, content: string | unknown[]): Promise<MessageSendResponse> {
      const result = await rpcClient.call<MessageSendResponse>("message.send", {
        agentId,
        content,
      });
      return { ...result, requestId: "" };
    },

    async interrupt(agentId: string): Promise<BaseResponse> {
      const result = await rpcClient.call<BaseResponse>("agent.interrupt", { agentId });
      return { ...result, requestId: "" };
    },

    async getMessages(agentId: string): Promise<Message[]> {
      const agentRes = await rpcClient.call<{ agent: AgentInfo | null }>("agent.get", { agentId });
      if (!agentRes.agent) return [];
      const msgRes = await rpcClient.call<{ messages: Message[] }>("image.messages", {
        imageId: agentRes.agent.imageId,
      });
      return msgRes.messages ?? [];
    },
  };
}
