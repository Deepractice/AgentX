/**
 * FileWorkspaceProvider - File system based workspace provider
 *
 * Provides isolated working directories for agents on Node.js.
 */

import type { Workspace, WorkspaceProvider, WorkspaceCreateConfig } from "@agentxjs/core/workspace";
import { mkdir, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { createLogger } from "commonxjs/logger";

const logger = createLogger("node-provider/FileWorkspaceProvider");

/**
 * Options for FileWorkspaceProvider
 */
export interface FileWorkspaceProviderOptions {
  /**
   * Base path for workspaces
   * @example "./data/workspaces"
   */
  basePath: string;
}

/**
 * FileWorkspace - File system based workspace
 */
class FileWorkspace implements Workspace {
  readonly id: string;
  readonly name: string;
  readonly path: string;

  private initialized = false;

  constructor(id: string, name: string, path: string) {
    this.id = id;
    this.name = name;
    this.path = path;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await mkdir(this.path, { recursive: true });
    this.initialized = true;

    logger.debug("Workspace initialized", { id: this.id, path: this.path });
  }

  async exists(): Promise<boolean> {
    try {
      await access(this.path);
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await rm(this.path, { recursive: true, force: true });
      logger.debug("Workspace cleaned up", { id: this.id, path: this.path });
    } catch (err) {
      logger.warn("Failed to cleanup workspace", { id: this.id, error: err });
    }
  }
}

/**
 * FileWorkspaceProvider - Creates file system based workspaces
 */
export class FileWorkspaceProvider implements WorkspaceProvider {
  readonly type = "file";

  private readonly basePath: string;
  private readonly workspaces = new Map<string, FileWorkspace>();

  constructor(options: FileWorkspaceProviderOptions) {
    this.basePath = options.basePath;
  }

  async create(config: WorkspaceCreateConfig): Promise<Workspace> {
    const workspaceId = this.generateWorkspaceId(config);
    const name = config.name ?? `workspace_${config.imageId}`;
    const path = join(this.basePath, config.containerId, config.imageId);

    const workspace = new FileWorkspace(workspaceId, name, path);
    this.workspaces.set(workspaceId, workspace);

    logger.debug("Workspace created", {
      id: workspaceId,
      containerId: config.containerId,
      imageId: config.imageId,
      path,
    });

    return workspace;
  }

  async get(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async listByContainer(containerId: string): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).filter((ws) =>
      ws.path.includes(`/${containerId}/`)
    );
  }

  async delete(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      await workspace.cleanup();
      this.workspaces.delete(workspaceId);
    }
  }

  private generateWorkspaceId(config: WorkspaceCreateConfig): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `ws_${config.containerId}_${config.imageId}_${timestamp}_${random}`;
  }
}
