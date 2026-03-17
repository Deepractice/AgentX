/**
 * AgentHandle — live reference to a created agent.
 *
 * Wraps identity (IDs) + delegates operations to instance namespaces.
 */

import type { Message } from "@agentxjs/core/agent";
import type { Presentation, PresentationOptions } from "./presentation";
import type {
  AgentConfig,
  AgentHandle,
  BaseResponse,
  MessageSendResponse,
  RuntimeNamespace,
} from "./types";

export class AgentHandleImpl implements AgentHandle {
  readonly instanceId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;

  private readonly ns: RuntimeNamespace;

  constructor(
    ids: { instanceId: string; imageId: string; containerId: string; sessionId: string },
    ns: RuntimeNamespace
  ) {
    this.instanceId = ids.instanceId;
    this.imageId = ids.imageId;
    this.containerId = ids.containerId;
    this.sessionId = ids.sessionId;
    this.ns = ns;
  }

  async send(content: string | unknown[]): Promise<MessageSendResponse> {
    return this.ns.session.send(this.instanceId, content);
  }

  async interrupt(): Promise<BaseResponse> {
    return this.ns.session.interrupt(this.instanceId);
  }

  async history(): Promise<Message[]> {
    return this.ns.image.getMessages(this.imageId);
  }

  async present(options?: PresentationOptions): Promise<Presentation> {
    return this.ns.present.create(this.instanceId, options);
  }

  async update(
    updates: Partial<
      Pick<
        AgentConfig,
        "name" | "description" | "model" | "systemPrompt" | "mcpServers" | "customData"
      >
    >
  ): Promise<void> {
    await this.ns.image.update(this.imageId, updates);
  }

  async delete(): Promise<void> {
    await this.ns.image.stop(this.imageId);
    await this.ns.image.delete(this.imageId);
  }
}
