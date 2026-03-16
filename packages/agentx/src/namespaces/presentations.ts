/**
 * Presentation namespace factory
 *
 * Singleton per imageId — same imageId always returns the same Presentation.
 * First call creates from history, subsequent calls return existing instance.
 * Options (onUpdate, onError) are additive — new handlers are merged in.
 */

import { messagesToConversations, Presentation, type PresentationOptions } from "../presentation";
import type { PresentationWorkspace } from "../presentation/types";
import type { AgentX, PresentationNamespace, SessionNamespace } from "../types";

/**
 * Workspace resolver — given an imageId, returns a PresentationWorkspace or null.
 * Provided by the client (local or remote) to decouple from runtime internals.
 */
export type WorkspaceResolver = (imageId: string) => Promise<PresentationWorkspace | null>;

export function createPresentations(
  agentx: AgentX,
  sessionNs: SessionNamespace,
  workspaceResolver?: WorkspaceResolver
): PresentationNamespace {
  const instances = new Map<string, Presentation>();

  return {
    async create(imageId: string, options?: PresentationOptions): Promise<Presentation> {
      // Return existing singleton
      const existing = instances.get(imageId);
      if (existing) {
        // Merge new handlers if provided
        if (options?.onUpdate) existing.onUpdate(options.onUpdate);
        if (options?.onError) existing.onError(options.onError);
        return existing;
      }

      // Resolve workspace for this image
      const workspace = workspaceResolver ? await workspaceResolver(imageId) : null;

      // Create new from history
      const messages = await sessionNs.getMessages(imageId);
      const conversations = messagesToConversations(messages);
      const presentation = new Presentation(agentx, imageId, options, conversations, workspace);

      instances.set(imageId, presentation);

      // Clean up on dispose
      const originalDispose = presentation.dispose.bind(presentation);
      presentation.dispose = () => {
        instances.delete(imageId);
        originalDispose();
      };

      return presentation;
    },
  };
}
