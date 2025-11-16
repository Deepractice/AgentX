/**
 * ReactorRegistry
 *
 * Manages the lifecycle of Reactors.
 */

import type { EventBus } from "@deepractice-ai/agentx-event";
import type { Reactor } from "./Reactor";
import type { ReactorContext } from "./ReactorContext";
import type { AgentLogger } from "~/AgentLogger";

/**
 * ReactorRegistry configuration
 */
export interface ReactorRegistryConfig {
  agentId: string;
  sessionId: string;
  logger?: AgentLogger;
}

/**
 * ReactorRegistry
 *
 * Internal component for managing Reactor lifecycle.
 */
export class ReactorRegistry {
  private reactors = new Map<string, Reactor>();
  private initialized = new Set<string>();
  private initOrder: string[] = [];

  constructor(
    private eventBus: EventBus,
    private config: ReactorRegistryConfig
  ) {}

  /**
   * Register a Reactor
   */
  register(reactor: Reactor): void {
    if (this.reactors.has(reactor.id)) {
      throw new Error(`Reactor already registered: ${reactor.id}`);
    }
    this.reactors.set(reactor.id, reactor);
  }

  /**
   * Register multiple Reactors
   */
  registerAll(reactors: Reactor[]): void {
    reactors.forEach((r) => this.register(r));
  }

  /**
   * Initialize all Reactors
   */
  async initialize(): Promise<void> {
    for (const [id, reactor] of this.reactors) {
      try {
        const context: ReactorContext = {
          consumer: this.eventBus.createConsumer(),
          producer: this.eventBus.createProducer(),
          logger: this.config.logger,
          agentId: this.config.agentId,
          sessionId: this.config.sessionId,
        };

        await reactor.initialize(context);
        this.initialized.add(id);
        this.initOrder.push(id);

        this.config.logger?.debug(`Reactor initialized: ${reactor.name}`, {
          reactorId: id,
        });
      } catch (error) {
        this.config.logger?.error(`Failed to initialize reactor: ${reactor.name}`, {
          reactorId: id,
          error,
        });
        throw error;
      }
    }
  }

  /**
   * Destroy all Reactors (reverse order)
   */
  async destroy(): Promise<void> {
    const destroyOrder = [...this.initOrder].reverse();

    for (const id of destroyOrder) {
      const reactor = this.reactors.get(id);
      if (!reactor || !this.initialized.has(id)) continue;

      try {
        await reactor.destroy();
        this.initialized.delete(id);

        this.config.logger?.debug(`Reactor destroyed: ${reactor.name}`, {
          reactorId: id,
        });
      } catch (error) {
        this.config.logger?.error(`Failed to destroy reactor: ${reactor.name}`, {
          reactorId: id,
          error,
        });
      }
    }

    this.reactors.clear();
    this.initOrder = [];
  }
}
