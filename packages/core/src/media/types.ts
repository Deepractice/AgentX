/**
 * Media Types — file processing strategy for LLM providers
 *
 * Different LLM providers support different file types natively.
 * MediaStrategy resolves file parts before sending to the provider:
 *   - Passthrough: provider handles it natively (image, PDF, plain text)
 *   - Extract: decode to text content (markdown, csv, json, etc.)
 *   - Unsupported: throw error with clear message
 */

import type { FilePart, UserContentPart } from "../agent/types";

/**
 * MediaStrategy — handles a specific set of media types
 */
export interface MediaStrategy {
  /** Check if this strategy handles the given media type */
  match(mediaType: string): boolean;

  /** Resolve a FilePart into a format the LLM can consume */
  resolve(file: FilePart): Promise<UserContentPart>;
}

/**
 * MediaResolver — resolves all file parts in a message
 */
export interface MediaResolver {
  /** Resolve file parts in content, converting unsupported types */
  resolve(parts: UserContentPart[]): Promise<UserContentPart[]>;
}
