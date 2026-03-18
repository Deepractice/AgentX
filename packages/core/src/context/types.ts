/**
 * Context Types — Layer 2 of the three-layer context model
 *
 * Three-layer context model:
 *   Layer 1: System Prompt (fixed, from Image config)
 *   Layer 2: Context (dynamic cognitive context — schema, capabilities, projection)
 *   Layer 3: Messages (conversation history, managed by Session)
 *
 * Context provides three things:
 *   - schema: cognitive framework (fixed per context)
 *   - project(): dynamic state projection (refreshed each turn)
 *   - capabilities(): what the context can do
 */

/**
 * Capability — a discrete capability provided by a cognitive context.
 *
 * Self-describing: includes name, description, parameters, and execute function.
 * The runtime converts these into whatever format the Driver needs.
 */
export interface Capability {
  /** Capability type — currently only "tool" */
  readonly type: "tool";
  /** Capability name */
  readonly name: string;
  /** Human-readable description */
  readonly description?: string;
  /** Parameter schema (JSON Schema) */
  readonly parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Execute this capability */
  execute(input: Record<string, unknown>): Promise<unknown>;
}

/**
 * Context — dynamic cognitive context for an agent.
 *
 * Concrete implementations live in external packages (e.g. RolexContextProvider).
 */
export interface Context {
  /** Cognitive schema — the world-level framework. */
  readonly schema: string;

  /**
   * Project the current cognitive state.
   * Called each turn to get the latest role/identity state.
   */
  project(): Promise<string>;

  /**
   * Capabilities provided by this context.
   * These are merged with other capabilities (bash, MCP, etc.) by the runtime.
   */
  capabilities(): Capability[];
}

/**
 * ContextProvider — factory for creating Context instances.
 *
 * Registered on AgentXPlatform. The runtime calls create(roleId)
 * when an Image with a roleId is run.
 */
export interface ContextProvider {
  /**
   * Create and initialize a Context for the given context ID.
   *
   * @param roleId - Identifier for the role (e.g. RoleX individual ID)
   * @returns Initialized Context ready for use
   */
  create(roleId: string): Promise<Context>;
}
