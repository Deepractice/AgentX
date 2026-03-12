/**
 * RolexContextProvider — factory for creating RolexContext instances.
 *
 * Implements ContextProvider. Registered on AgentXPlatform to provide
 * cognitive context for Images with a contextId.
 *
 * @example
 * ```typescript
 * import { localPlatform } from "@rolexjs/local-platform";
 * import { RolexContextProvider } from "@agentxjs/core/context";
 *
 * const contextProvider = new RolexContextProvider(localPlatform({ dataPath }));
 * const platform = await createNodePlatform({ contextProvider });
 * ```
 */

import type { Platform } from "rolexjs";
import { RolexContext } from "./rolex-context";
import type { Context, ContextProvider } from "./types";

export class RolexContextProvider implements ContextProvider {
  private readonly platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }

  async create(contextId: string): Promise<Context> {
    const ctx = new RolexContext({
      platform: this.platform,
      roleId: contextId,
    });
    await ctx.initialize();
    return ctx;
  }
}
