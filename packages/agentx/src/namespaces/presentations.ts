/**
 * Presentation namespace factory
 *
 * Single factory for both local and remote modes.
 */

import { messagesToConversations, Presentation, type PresentationOptions } from "../presentation";
import type { AgentX, PresentationNamespace, SessionNamespace } from "../types";

/**
 * Create presentation namespace.
 *
 * Takes the full AgentX (for Presentation event wiring) and the SessionNamespace
 * (for message history via instanceId).
 */
export function createPresentations(
  agentx: AgentX,
  sessionNs: SessionNamespace
): PresentationNamespace {
  return {
    async create(imageId: string, options?: PresentationOptions): Promise<Presentation> {
      const messages = await sessionNs.getMessages(imageId);
      const conversations = messagesToConversations(messages);
      return new Presentation(agentx, imageId, options, conversations);
    },
  };
}
