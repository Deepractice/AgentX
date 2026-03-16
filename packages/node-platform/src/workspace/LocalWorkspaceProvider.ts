/**
 * LocalWorkspaceProvider - Creates LocalWorkspace instances by ID
 *
 * Maps workspaceId to a subdirectory under the base path.
 * Each agent gets its own isolated directory.
 */

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { WorkspaceProvider } from "@agentxjs/core/workspace";
import { LocalWorkspace } from "./LocalWorkspace";

/**
 * LocalWorkspaceProvider — maps workspaceId to local filesystem directories
 *
 * @example
 * ```typescript
 * const provider = new LocalWorkspaceProvider("~/.deepractice/agentx/workspaces");
 * const workspace = await provider.create("ws_abc123");
 * // workspace.root = ~/.deepractice/agentx/workspaces/ws_abc123
 * ```
 */
export class LocalWorkspaceProvider implements WorkspaceProvider {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async create(workspaceId: string): Promise<LocalWorkspace> {
    const workspacePath = join(this.basePath, workspaceId);
    await mkdir(workspacePath, { recursive: true });
    return new LocalWorkspace(workspacePath);
  }
}
