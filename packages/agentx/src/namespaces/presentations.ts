/**
 * Presentation namespace factory
 *
 * Single factory for both local and remote modes —
 * Presentation only depends on the AgentX interface.
 */

import type { AgentX, PresentationNamespace } from "../types";
import { Presentation, type PresentationOptions } from "../presentation";

/**
 * Create presentation namespace backed by any AgentX client
 */
export function createPresentations(agentx: AgentX): PresentationNamespace {
  return {
    create(agentId: string, options?: PresentationOptions): Presentation {
      return new Presentation(agentx, agentId, options);
    },
  };
}
