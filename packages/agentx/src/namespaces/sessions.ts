/**
 * Session namespace factories (messaging)
 */

import type { AgentXRuntime } from "@agentxjs/core/runtime";
import type { UserContentPart } from "@agentxjs/core/agent";
import type { RpcClient } from "@agentxjs/core/network";
import type {
  SessionNamespace,
  MessageSendResponse,
  BaseResponse,
} from "../types";

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
  };
}
