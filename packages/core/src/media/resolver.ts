/**
 * MediaResolver — resolves file parts using a strategy chain
 */

import type { UserContentPart } from "../agent/types";
import type { MediaResolver, MediaStrategy } from "./types";

/**
 * Create a MediaResolver with the given strategy chain.
 * Strategies are matched in order — first match wins.
 */
export function createMediaResolver(strategies: MediaStrategy[]): MediaResolver {
  return {
    async resolve(parts: UserContentPart[]): Promise<UserContentPart[]> {
      const resolved: UserContentPart[] = [];

      for (const part of parts) {
        if (part.type !== "file") {
          resolved.push(part);
          continue;
        }

        const strategy = strategies.find((s) => s.match(part.mediaType));
        if (!strategy) {
          throw new UnsupportedMediaTypeError(part.mediaType, part.filename);
        }

        resolved.push(await strategy.resolve(part));
      }

      return resolved;
    },
  };
}

/**
 * UnsupportedMediaTypeError — thrown when no strategy can handle a file type
 */
export class UnsupportedMediaTypeError extends Error {
  readonly mediaType: string;
  readonly filename?: string;

  constructor(mediaType: string, filename?: string) {
    const name = filename ? `"${filename}" (${mediaType})` : mediaType;
    super(`Unsupported file type: ${name}. Supported types: images, PDF, and text files.`);
    this.name = "UnsupportedMediaTypeError";
    this.mediaType = mediaType;
    this.filename = filename;
  }
}
