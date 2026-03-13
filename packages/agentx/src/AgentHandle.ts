/**
 * AgentHandle — live reference to a created agent.
 *
 * Wraps identity (IDs) + delegates operations to instance namespaces.
 */

import type { Message } from "@agentxjs/core/agent";
import type { Presentation, PresentationOptions } from "./presentation";
import type {
  AgentHandle,
  BaseResponse,
  Embodiment,
  InstanceNamespace,
  MessageSendResponse,
} from "./types";

export class AgentHandleImpl implements AgentHandle {
  readonly agentId: string;
  readonly imageId: string;
  readonly containerId: string;
  readonly sessionId: string;

  private readonly ns: InstanceNamespace;

  constructor(
    ids: { agentId: string; imageId: string; containerId: string; sessionId: string },
    ns: InstanceNamespace
  ) {
    this.agentId = ids.agentId;
    this.imageId = ids.imageId;
    this.containerId = ids.containerId;
    this.sessionId = ids.sessionId;
    this.ns = ns;
  }

  async send(content: string | unknown[]): Promise<MessageSendResponse> {
    return this.ns.session.send(this.agentId, content);
  }

  async interrupt(): Promise<BaseResponse> {
    return this.ns.session.interrupt(this.agentId);
  }

  async history(): Promise<Message[]> {
    return this.ns.image.getMessages(this.imageId);
  }

  async present(options?: PresentationOptions): Promise<Presentation> {
    return this.ns.present.create(this.agentId, options);
  }

  async update(updates: {
    name?: string;
    description?: string;
    embody?: Embodiment;
    customData?: Record<string, unknown>;
  }): Promise<void> {
    await this.ns.image.update(this.imageId, updates);
  }

  async delete(): Promise<void> {
    await this.ns.agent.destroy(this.agentId);
    await this.ns.image.delete(this.imageId);
  }
}
