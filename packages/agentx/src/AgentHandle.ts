/**
 * AgentHandle — live reference to a created agent.
 *
 * Wraps identity (IDs) + delegates operations via rpc().
 */

import type { Message } from "@agentxjs/core/agent";
import type { SendOptions } from "@agentxjs/core/driver";
import type { Presentation, PresentationOptions } from "./presentation";
import type { AgentConfig, AgentHandle, BaseResponse, MessageSendResponse } from "./types";

interface AgentXRpc {
  rpc<T = unknown>(method: string, params?: unknown): Promise<T>;
  present: { create(imageId: string, options?: PresentationOptions): Promise<Presentation> };
}

export class AgentHandleImpl implements AgentHandle {
  readonly instanceId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;

  private readonly ax: AgentXRpc;

  constructor(
    ids: { instanceId: string; imageId: string; containerId: string; sessionId: string },
    ax: AgentXRpc
  ) {
    this.instanceId = ids.instanceId;
    this.imageId = ids.imageId;
    this.containerId = ids.containerId;
    this.sessionId = ids.sessionId;
    this.ax = ax;
  }

  async send(content: string | unknown[], options?: SendOptions): Promise<MessageSendResponse> {
    return this.ax.rpc<MessageSendResponse>("message.send", { instanceId: this.instanceId, content, options });
  }

  async interrupt(): Promise<BaseResponse> {
    return this.ax.rpc("instance.interrupt", { instanceId: this.instanceId });
  }

  async history(): Promise<Message[]> {
    const res = await this.ax.rpc<{ messages: Message[] }>("image.messages", {
      imageId: this.imageId,
    });
    return res.messages ?? [];
  }

  async present(options?: PresentationOptions): Promise<Presentation> {
    return this.ax.present.create(this.imageId, options);
  }

  async update(
    updates: Partial<
      Pick<
        AgentConfig,
        "name" | "description" | "model" | "systemPrompt" | "mcpServers" | "customData"
      >
    >
  ): Promise<void> {
    await this.ax.rpc("image.update", { imageId: this.imageId, updates });
  }

  async delete(): Promise<void> {
    await this.ax.rpc("image.stop", { imageId: this.imageId });
    await this.ax.rpc("image.delete", { imageId: this.imageId });
  }
}
