/**
 * DefinitionRecord - Storage schema for AgentDefinition persistence
 *
 * Pure data type representing an agent definition in storage.
 * Can be loaded from various sources: code, file (AgentFile), or database.
 *
 * Part of Docker-style layered architecture:
 * AgentFile/Code → register → Definition → MetaImage → Session → Agent
 *
 * Similar to Dockerfile:
 * - Dockerfile is source (text file)
 * - Docker Image is built artifact (persisted)
 * - AgentFile is source (definition file)
 * - MetaImage is built artifact (persisted)
 */

/**
 * Definition storage record
 *
 * Stores the agent definition configuration.
 * This is the "source" that produces MetaImage when registered.
 */
export interface DefinitionRecord {
  /**
   * Unique definition name (primary key)
   * Pattern: lowercase-with-dashes (e.g., "translator", "code-assistant")
   */
  name: string;

  /**
   * Human-readable description
   */
  description?: string;

  /**
   * System prompt for the agent
   */
  systemPrompt?: string;

  /**
   * Serialized definition data (JSON)
   * Contains all AgentDefinition fields
   */
  definition: Record<string, unknown>;

  /**
   * Source type: where this definition came from
   * - 'code': Defined in application code
   * - 'file': Loaded from AgentFile
   * - 'database': Stored in database
   */
  source: "code" | "file" | "database";

  /**
   * Source path (for 'file' source)
   * e.g., "/path/to/agent.yaml" or "agents/translator.json"
   */
  sourcePath?: string;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix milliseconds)
   */
  updatedAt: number;
}
