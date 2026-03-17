/**
 * LocalOSProvider — Creates LocalOS instances by ID.
 *
 * Maps osId to a subdirectory under the base path.
 * Each agent gets its own isolated OS environment.
 */

import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { OSProvider } from "@agentxjs/core/os";
import { LocalOS } from "./LocalOS";

export class LocalOSProvider implements OSProvider {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = resolve(basePath);
  }

  async create(osId: string): Promise<LocalOS> {
    const osPath = join(this.basePath, osId);
    await mkdir(osPath, { recursive: true });
    return new LocalOS(osPath);
  }
}
