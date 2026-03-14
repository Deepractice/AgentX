/**
 * Built-in Media Strategies
 *
 * - passthrough: send directly to LLM (provider handles it)
 * - textExtract: decode base64 to text, wrap as TextPart
 */

import type { MediaStrategy } from "./types";

/**
 * PassthroughStrategy — file types the LLM provider handles natively.
 * Returns the FilePart as-is.
 *
 * @param patterns - glob-like media type patterns (e.g. "image/*", "application/pdf")
 */
export function passthrough(patterns: string[]): MediaStrategy {
  return {
    match: (mediaType) => matchPatterns(mediaType, patterns),
    resolve: async (file) => file,
  };
}

/**
 * TextExtractStrategy — decode base64 file content to text.
 * Wraps the decoded text in a TextPart with filename context.
 *
 * @param patterns - media type patterns to handle (e.g. "text/markdown", "application/json")
 */
export function textExtract(patterns: string[]): MediaStrategy {
  return {
    match: (mediaType) => matchPatterns(mediaType, patterns),
    resolve: async (file) => {
      const text = decodeBase64(file.data);
      const label = file.filename ?? file.mediaType;
      return {
        type: "text",
        text: `[File: ${label}]\n${text}`,
      };
    },
  };
}

/**
 * Decode base64 string to UTF-8 text.
 * Handles both base64 and data URL formats.
 */
function decodeBase64(data: string): string {
  // Strip data URL prefix if present
  const base64 = data.includes(",") ? data.split(",")[1] : data;
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Match a media type against glob-like patterns.
 * Supports exact match and wildcard suffix (e.g. "image/*", "text/*").
 */
function matchPatterns(mediaType: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) {
      return mediaType.startsWith(pattern.slice(0, -1));
    }
    return mediaType === pattern;
  });
}
