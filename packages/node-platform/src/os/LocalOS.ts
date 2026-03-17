/**
 * LocalOS — Node.js implementation of AgentOS
 *
 * fs and sh share the same root directory.
 * fs uses node:fs/promises, sh uses execa.
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
  AgentOS,
  Environment,
  ExecOptions,
  ExecResult,
  FileEntry,
  FileStat,
  FileSystem,
  ProcessHandle,
  ProcessInfo,
  ReadOptions,
  Shell,
  StartOptions,
} from "@agentxjs/core/os";
import { createLogger } from "commonxjs/logger";
import { execa } from "execa";

const logger = createLogger("node-platform/LocalOS");

const DEFAULT_TIMEOUT = 30_000;

// ============================================================================
// LocalFileSystem
// ============================================================================

class LocalFileSystem implements FileSystem {
  constructor(private readonly root: string) {}

  private resolvePath(path: string): string {
    const resolved = resolve(this.root, normalize(path));
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path safety violation: "${path}" resolves outside OS root`);
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
    const offset = (options.offset ?? 1) - 1;
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
}

// ============================================================================
// LocalShell
// ============================================================================

class LocalShell implements Shell {
  private processes = new Map<
    string,
    { command: string; subprocess: any; state: "running" | "exited"; exitCode?: number }
  >();
  private nextPid = 1;

  constructor(private readonly root: string) {}

  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const cwd = options?.cwd ? resolve(this.root, options.cwd) : this.root;

    logger.debug("Executing command", { command: command.substring(0, 100), cwd, timeout });

    const result = await execa({
      shell: true,
      cwd,
      timeout,
      env: options?.env ? { ...process.env, ...options.env } : undefined,
      reject: false,
    })`${command}`;

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 1,
    };
  }

  async start(command: string, options?: StartOptions): Promise<ProcessHandle> {
    const cwd = options?.cwd ? resolve(this.root, options.cwd) : this.root;
    const pid = `proc_${this.nextPid++}`;

    const subprocess = execa({
      shell: true,
      cwd,
      env: options?.env ? { ...process.env, ...options.env } : undefined,
      reject: false,
      detached: false,
    })`${command}`;

    const entry = {
      command,
      subprocess,
      state: "running" as const,
      exitCode: undefined as number | undefined,
    };
    this.processes.set(pid, entry);

    // Track process exit
    subprocess
      .then((result: any) => {
        const proc = this.processes.get(pid);
        if (proc) {
          proc.state = "exited";
          proc.exitCode = result.exitCode ?? 1;
        }
      })
      .catch(() => {
        const proc = this.processes.get(pid);
        if (proc) {
          proc.state = "exited";
          proc.exitCode = 1;
        }
      });

    logger.debug("Background process started", { pid, command: command.substring(0, 100), cwd });

    return { pid, command };
  }

  async list(): Promise<ProcessInfo[]> {
    return Array.from(this.processes.entries()).map(([pid, entry]) => ({
      pid,
      command: entry.command,
      state: entry.state,
      exitCode: entry.exitCode,
    }));
  }

  async kill(pid: string): Promise<void> {
    const entry = this.processes.get(pid);
    if (!entry) {
      throw new Error(`Process not found: ${pid}`);
    }
    if (entry.state === "running") {
      entry.subprocess.kill("SIGTERM");
      entry.state = "exited";
      entry.exitCode = 143; // SIGTERM
    }
    this.processes.delete(pid);
  }
}

// ============================================================================
// LocalOS
// ============================================================================

/**
 * LocalOS — AgentOS backed by local Node.js filesystem and child_process.
 *
 * fs and sh share the same root directory — write a file, run it immediately.
 */
export class LocalOS implements AgentOS {
  readonly fs: FileSystem;
  readonly sh: Shell;
  readonly env: Environment;

  constructor(root: string) {
    const resolvedRoot = resolve(root);
    this.fs = new LocalFileSystem(resolvedRoot);
    this.sh = new LocalShell(resolvedRoot);
    this.env = {
      cwd: resolvedRoot,
      platform: "node",
      vars: () => ({ ...process.env }) as Record<string, string>,
    };
  }

  /**
   * Watch for file system changes (optional capability).
   * Not part of AgentOS interface — platform-specific.
   */
  watch(handler: (event: { type: string; path: string }) => void): () => void {
    const root = this.env.cwd;
    const watcher = watch(root, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const filePath = filename.replace(/\\/g, "/");
      handler({
        type: eventType === "rename" ? "create" : "change",
        path: filePath,
      });
    });
    return () => watcher.close();
  }
}
