/**
 * Presentation namespace factory
 *
 * Single factory for both local and remote modes —
 * Presentation only depends on the AgentX interface.
 */

import { messagesToConversations, Presentation, type PresentationOptions } from "../presentation";
import type { AgentX, PresentationNamespace } from "../types";

/**
 * Create presentation namespace backed by any AgentX client
 */
export function createPresentations(agentx: AgentX): PresentationNamespace {
  return {
    async create(agentId: string, options?: PresentationOptions): Promise<Presentation> {
      const messages = await agentx.sessions.getMessages(agentId);
      const conversations = messagesToConversations(messages);
      return new Presentation(agentx, agentId, options, conversations);
    },
  };
}
