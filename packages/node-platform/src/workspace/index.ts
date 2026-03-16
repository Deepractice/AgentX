/**
 * Workspace Module — Node.js Implementation
 *
 * Provides LocalWorkspace backed by the local filesystem.
 *
 * Usage:
 * ```typescript
 * import { LocalWorkspace } from "@agentxjs/node-platform/workspace";
 *
 * const workspace = new LocalWorkspace("/path/to/project");
 * const content = await workspace.read("src/index.ts");
 * ```
 */

export { LocalWorkspace } from "./LocalWorkspace";
export { LocalWorkspaceProvider } from "./LocalWorkspaceProvider";
