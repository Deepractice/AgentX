/**
 * Media — file processing for LLM providers
 */

export { createMediaResolver, UnsupportedMediaTypeError } from "./resolver";
export { passthrough, textExtract } from "./strategies";
export type { MediaResolver, MediaStrategy } from "./types";
