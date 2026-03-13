/**
 * Presentation namespace factory
 *
 * Single factory for both local and remote modes.
 */

import { messagesToConversations, Presentation, type PresentationOptions } from "../presentation";
import type { AgentX, ImageNamespace, PresentationNamespace } from "../types";

/**
 * Create presentation namespace.
 *
 * Takes the full AgentX (for Presentation event wiring) and the ImageNamespace
 * (for message history), avoiding circular access to `instance` during construction.
 */
export function createPresentations(
  agentx: AgentX,
  imageNs: ImageNamespace
): PresentationNamespace {
  return {
    async create(agentId: string, options?: PresentationOptions): Promise<Presentation> {
      const messages = await imageNs.getMessages(agentId);
      const conversations = messagesToConversations(messages);
      return new Presentation(agentx, agentId, options, conversations);
    },
  };
}
