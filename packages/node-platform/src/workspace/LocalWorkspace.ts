/**
 * LocalWorkspace - Node.js implementation of Workspace
 *
 * Uses fs/promises for file operations.
 * All paths are resolved relative to the workspace root.
 * Path safety: prevents access outside the root directory.
 */

import { watch } from "node:fs";
import {
  mkdir as fsMkdir,
  stat as fsStat,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";
import type {
  FileChangeHandler,
  FileEntry,
  FileStat,
  GlobOptions,
  GrepMatch,
  GrepOptions,
  ReadOptions,
  SearchableWorkspace,
  WatchableWorkspace,
} from "@agentxjs/core/workspace";

/**
 * LocalWorkspace - File operations backed by local filesystem
 *
 * Implements SearchableWorkspace (grep + glob included).
 *
 * @example
 * ```typescript
 * const workspace = new LocalWorkspace("/path/to/project");
 * const content = await workspace.read("src/index.ts");
 * await workspace.write("output.txt", "Hello");
 * ```
 */
export class LocalWorkspace implements SearchableWorkspace, WatchableWorkspace {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  /**
   * Resolve a relative path to an absolute path within the workspace.
   * Throws if the resolved path escapes the workspace root.
   */
  private resolvePath(path: string): string {
    const resolved = resolve(this.root, normalize(path));
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path safety violation: "${path}" resolves outside workspace root`);
    }
    return resolved;
  }

  async read(path: string, options?: ReadOptions): Promise<string> {
    const fullPath = this.resolvePath(path);
    const content = await readFile(fullPath, "utf-8");

    if (!options?.offset && !options?.limit) {
      return content;
    }

    const lines = content.split("\n");
    const offset = (options.offset ?? 1) - 1; // 1-based to 0-based
    const limit = options.limit ?? lines.length;
    return lines.slice(offset, offset + limit).join("\n");
  }

  async write(path: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await fsMkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }

  async exists(path: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(path);
      await fsStat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStat | null> {
    try {
      const fullPath = this.resolvePath(path);
      const stats = await fsStat(fullPath);
      return {
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.size,
        mtime: stats.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  async remove(path: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await rm(fullPath, { recursive: true, force: true });
  }

  async list(path = "."): Promise<FileEntry[]> {
    const fullPath = this.resolvePath(path);
    const entries = await readdir(fullPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      path: join(path, entry.name),
      type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
    }));
  }

  async mkdir(path: string): Promise<void> {
    const fullPath = this.resolvePath(path);
    await fsMkdir(fullPath, { recursive: true });
  }

  async grep(pattern: string, options?: GrepOptions): Promise<GrepMatch[]> {
    const regex = new RegExp(pattern, options?.ignoreCase ? "i" : undefined);
    const maxResults = options?.maxResults ?? 100;
    const matches: GrepMatch[] = [];

    const files = await this.glob(options?.glob ?? "**/*", {
      ignore: ["node_modules/**", ".git/**"],
    });

    for (const file of files) {
      if (matches.length >= maxResults) break;

      try {
        const fullPath = this.resolvePath(file);
        const stat = await fsStat(fullPath);
        if (stat.isDirectory()) continue;

        const content = await readFile(fullPath, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) break;
          if (regex.test(lines[i])) {
            matches.push({
              file,
              line: i + 1,
              content: lines[i],
            });
          }
        }
      } catch {
        // Skip files that can't be read (binary, permission, etc.)
      }
    }

    return matches;
  }

  async glob(pattern: string, options?: GlobOptions): Promise<string[]> {
    // Use Node.js built-in glob (available since Node 22)
    const { glob: nodeGlob } = await import("node:fs/promises");
    const cwd = options?.cwd ? this.resolvePath(options.cwd) : this.root;

    const results: string[] = [];
    for await (const entry of nodeGlob(pattern, {
      cwd,
      exclude: (name) => {
        const ignores = options?.ignore ?? ["node_modules/**", ".git/**"];
        return ignores.some((ig) => {
          // Simple check: if the ignore pattern starts with the name
          const igBase = ig.split("/")[0];
          return name === igBase;
        });
      },
    })) {
      results.push(options?.cwd ? join(options.cwd, entry) : entry);
    }

    return results;
  }

  watch(handler: FileChangeHandler): () => void {
    const watcher = watch(this.root, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      // Normalize path separators
      const filePath = filename.replace(/\\/g, "/");
      handler({
        type: eventType === "rename" ? "create" : "change",
        path: filePath,
      });
    });

    return () => {
      watcher.close();
    };
  }
}
