/**
 * DefinitionFacade - Agent definition management
 *
 * Internal facade for managing AgentDefinition lifecycle.
 * Handles registration, retrieval, and removal of definitions.
 *
 * Definition → Image → Session → Agent
 */

import type { AgentDefinition } from "../definition";

/**
 * DefinitionFacade - Definition CRUD operations
 */
export interface DefinitionFacade {
  /**
   * Register an agent definition
   *
   * @param definition - Agent definition to register
   * @throws Error if definition with same name already exists
   */
  register(definition: AgentDefinition): Promise<void>;

  /**
   * Get a definition by name
   *
   * @param name - Definition name
   * @returns Definition or undefined if not found
   */
  get(name: string): Promise<AgentDefinition | undefined>;

  /**
   * List all registered definitions
   *
   * @returns Array of all definitions
   */
  list(): Promise<AgentDefinition[]>;

  /**
   * Check if a definition exists
   *
   * @param name - Definition name
   * @returns true if exists
   */
  has(name: string): Promise<boolean>;

  /**
   * Unregister a definition
   *
   * @param name - Definition name
   * @returns true if removed, false if not found
   */
  unregister(name: string): Promise<boolean>;
}
