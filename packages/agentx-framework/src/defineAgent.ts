/**
 * defineAgent
 *
 * Vue-like API for defining agents with config-first approach.
 */

import type { AgentDriver } from "@deepractice-ai/agentx-core";
import type { AgentLogger } from "@deepractice-ai/agentx-core";
import type { Reactor } from "@deepractice-ai/agentx-core";
import { createAgent } from "@deepractice-ai/agentx-core";
import type { ConfigSchema, InferConfig } from "./schema";
import { validateAndMergeConfig } from "./schema";

/**
 * Agent definition
 *
 * Defines the structure of an agent:
 * 1. Config schema - What configuration is needed
 * 2. Driver factory - How to create the driver from config
 * 3. Reactors factories - Optional event handlers
 * 4. Logger factory - Optional logger
 */
export interface AgentDefinition<TSchema extends ConfigSchema> {
  /**
   * Configuration schema
   *
   * Defines the structure and validation rules for agent config.
   *
   * @example
   * ```typescript
   * config: {
   *   apiKey: { type: String, required: true },
   *   model: { type: String, default: "claude-3-5-sonnet-20241022" },
   *   maxTurns: { type: Number, default: 10 },
   *   debug: { type: Boolean, optional: true },
   * }
   * ```
   */
  config: TSchema;

  /**
   * Driver factory function
   *
   * Creates an AgentDriver instance from the validated config.
   *
   * @param config - Validated configuration (with defaults applied)
   * @returns AgentDriver instance
   *
   * @example
   * ```typescript
   * driver: (config) => new ClaudeDriver({
   *   apiKey: config.apiKey,
   *   model: config.model,
   * })
   * ```
   */
  driver: (config: InferConfig<TSchema>) => AgentDriver;

  /**
   * Reactor factory functions (optional)
   *
   * Array of functions that create Reactor instances.
   * Each reactor receives the validated config.
   * Return null to skip a reactor based on config.
   *
   * @example
   * ```typescript
   * reactors: [
   *   (config) => new ChatLogger({ level: config.logLevel }),
   *   (config) => config.enableDb ? new Database() : null,
   * ]
   * ```
   */
  reactors?: ((config: InferConfig<TSchema>) => Reactor | null)[];

  /**
   * Logger factory function (optional)
   *
   * Creates an AgentLogger instance from the validated config.
   *
   * @example
   * ```typescript
   * logger: (config) => new PinoLogger({
   *   level: config.logLevel || "info"
   * })
   * ```
   */
  logger?: (config: InferConfig<TSchema>) => AgentLogger;
}

/**
 * Defined agent
 *
 * Result of calling defineAgent().
 * Provides a create() method to instantiate agents with config.
 */
export interface DefinedAgent<TSchema extends ConfigSchema> {
  /**
   * Create an agent instance
   *
   * Validates config against schema, applies defaults,
   * and creates driver, reactors, and logger.
   *
   * @param config - User configuration (partial, will be merged with defaults)
   * @returns AgentService instance
   *
   * @example
   * ```typescript
   * const agent = MyAgent.create({
   *   apiKey: process.env.ANTHROPIC_API_KEY,
   *   model: "claude-3-5-sonnet-20241022",
   * });
   *
   * await agent.initialize();
   * ```
   */
  create(config: Partial<InferConfig<TSchema>>): ReturnType<typeof createAgent>;

  /**
   * Get the agent definition
   *
   * @returns The original definition passed to defineAgent()
   */
  getDefinition(): AgentDefinition<TSchema>;
}

/**
 * Define an agent
 *
 * Creates a reusable agent definition with config schema, driver, reactors, and logger.
 * Similar to Vue's defineComponent pattern.
 *
 * @param definition - Agent definition with config schema and factories
 * @returns DefinedAgent with create() method
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-node";
 * import { ChatLogger, Analytics } from "./reactors";
 *
 * const MyAgent = defineAgent({
 *   config: {
 *     apiKey: { type: String, required: true },
 *     model: { type: String, default: "claude-3-5-sonnet-20241022" },
 *     logLevel: { type: String, default: "info" },
 *   },
 *
 *   driver: (config) => new ClaudeDriver({
 *     apiKey: config.apiKey,
 *     model: config.model,
 *   }),
 *
 *   reactors: [
 *     (config) => new ChatLogger({ level: config.logLevel }),
 *     (config) => new Analytics(),
 *   ],
 *
 *   logger: (config) => new PinoLogger({ level: config.logLevel }),
 * });
 *
 * // Create instance
 * const agent = MyAgent.create({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   logLevel: "debug", // Override default
 * });
 *
 * await agent.initialize();
 * await agent.send("Hello!");
 * ```
 */
export function defineAgent<TSchema extends ConfigSchema>(
  definition: AgentDefinition<TSchema>
): DefinedAgent<TSchema> {
  return {
    create(userConfig: Partial<InferConfig<TSchema>>) {
      // 1. Validate and merge config with defaults
      const config = validateAndMergeConfig(definition.config, userConfig);

      // 2. Create driver
      const driver = definition.driver(config);

      // 3. Create logger (optional)
      const logger = definition.logger ? definition.logger(config) : undefined;

      // 4. Create reactors (optional)
      let reactors: Reactor[] | undefined;
      if (definition.reactors) {
        reactors = definition.reactors
          .map((factory) => factory(config))
          .filter((reactor): reactor is Reactor => reactor !== null);
      }

      // 5. Create agent using core API
      return createAgent(driver, logger, reactors ? { reactors } : undefined);
    },

    getDefinition() {
      return definition;
    },
  };
}
