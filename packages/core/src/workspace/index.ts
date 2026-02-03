/**
 * Workspace Module
 *
 * Abstraction for isolated working environments.
 * Platform packages provide concrete implementations.
 *
 * Usage:
 * ```typescript
 * import type { Workspace, WorkspaceProvider } from "@agentxjs/core/workspace";
 *
 * // Platform provides implementation
 * const provider: WorkspaceProvider = new FileWorkspaceProvider({
 *   basePath: "~/.agentx/workspaces"
 * });
 *
 * // Create workspace for an agent
 * const workspace = await provider.create({
 *   containerId: "user-123",
 *   imageId: "img_xxx",
 * });
 *
 * await workspace.initialize();
 * console.log(workspace.path); // ~/.agentx/workspaces/user-123/img_xxx
 * ```
 */

export type { Workspace, WorkspaceCreateConfig, WorkspaceProvider } from "./types";
