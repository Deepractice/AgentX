/**
 * Common Module - Shared Infrastructure Types
 *
 * Infrastructure types shared across all AgentX packages.
 *
 * ## Why Types Here, Implementation in @agentxjs/common?
 *
 * - @agentxjs/types has zero dependencies (pure types)
 * - @agentxjs/common has runtime dependencies (pino, etc.)
 * - All packages depend on types, not all need common's implementation
 *
 * ## Module Structure
 *
 * | Module   | Purpose                           |
 * |----------|-----------------------------------|
 * | logger/  | Logger interface (SLF4J-style)    |
 *
 * @packageDocumentation
 */

export * from "./logger";
