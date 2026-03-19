/**
 * Session namespace — type-safe wrapper over rpc()
 */

import type { Message } from "@agentxjs/core/agent";
import type { SendOptions } from "@agentxjs/core/driver";
import type { BaseResponse, MessageSendResponse, SessionNamespace } from "../types";

type RpcFn = <T = unknown>(method: string, params?: unknown) => Promise<T>;

/**
 * Detect whether an ID is an imageId or instanceId based on prefix.
 */
function resolveId(id: string): { imageId?: string; instanceId?: string } {
  if (id.startsWith("inst_")) return { instanceId: id };
  return { imageId: id };
}

export function createSessions(rpc: RpcFn): SessionNamespace {
  return {
    async send(
      id: string,
      content: string | unknown[],
      options?: SendOptions
    ): Promise<MessageSendResponse> {
      return rpc<MessageSendResponse>("message.send", {
        ...resolveId(id),
        content,
        options,
      });
    },

    async interrupt(id: string): Promise<BaseResponse> {
      return rpc<BaseResponse>("instance.interrupt", resolveId(id));
    },

    async getMessages(id: string): Promise<Message[]> {
      // For instanceId, resolve to imageId first
      if (id.startsWith("inst_")) {
        const agentRes = await rpc<{ agent: { imageId: string } | null }>("instance.get", {
          instanceId: id,
        });
        if (!agentRes.agent) return [];
        id = agentRes.agent.imageId;
      }
      const result = await rpc<{ imageId: string; messages: Message[] }>("image.messages", {
        imageId: id,
      });
      return result.messages ?? [];
    },
  };
}
