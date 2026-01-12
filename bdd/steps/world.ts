/**
 * BDD World - Shared context for all step definitions
 */

import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import type { AgentX } from "@agentxjs/types/agentx";
import type { SystemEvent } from "@agentxjs/types/event";

/**
 * Custom World with AgentX context
 */
export class AgentXWorld extends World {
  // AgentX instance (server in local mode, client in remote mode)
  agentx?: AgentX;

  // Server instance (for remote mode tests)
  server?: AgentX;

  // Last response from request()
  lastResponse?: SystemEvent;

  // Collected events from subscriptions
  collectedEvents: SystemEvent[] = [];

  // Event handlers (for unsubscribe tracking)
  eventHandlers: Map<string, () => void> = new Map();

  // Server ports used in tests (for cleanup)
  usedPorts: number[] = [];

  // Remote client instances (for multi-client tests)
  remoteClients: Map<string, AgentX> = new Map();

  // Created resources (for tracking)
  createdContainers: string[] = [];
  createdImages: Map<string, string> = new Map(); // imageId -> containerId
  savedValues: Map<string, string> = new Map(); // for saving response values

  // Messages received (for reliability tests)
  receivedMessages: Map<string, string[]> = new Map(); // clientId -> messages

  // Connection state
  isConnected = false;

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Clean up resources after each scenario
   */
  async cleanup(): Promise<void> {
    // Unsubscribe all handlers
    for (const unsubscribe of this.eventHandlers.values()) {
      unsubscribe();
    }
    this.eventHandlers.clear();

    // Close remote clients
    for (const client of this.remoteClients.values()) {
      await client.dispose();
    }
    this.remoteClients.clear();

    // Dispose main AgentX (client)
    if (this.agentx) {
      await this.agentx.dispose();
      this.agentx = undefined;
    }

    // Dispose server
    if (this.server) {
      await this.server.dispose();
      this.server = undefined;
    }

    // Clear state
    this.lastResponse = undefined;
    this.collectedEvents = [];
    this.createdContainers = [];
    this.createdImages.clear();
    this.savedValues.clear();
    this.receivedMessages.clear();
    this.usedPorts = [];
    this.isConnected = false;
  }

  /**
   * Subscribe to an event type and collect events
   */
  subscribeToEvent(type: string): void {
    if (!this.agentx) throw new Error("AgentX not initialized");

    const unsubscribe = this.agentx.on(type, (event) => {
      this.collectedEvents.push(event);
    });

    this.eventHandlers.set(type, unsubscribe);
  }

  /**
   * Get events of a specific type
   */
  getEventsOfType(type: string): SystemEvent[] {
    return this.collectedEvents.filter((e) => e.type === type);
  }

  /**
   * Wait for an event of a specific type
   */
  async waitForEvent(type: string, timeout = 5000): Promise<SystemEvent> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const events = this.getEventsOfType(type);
      if (events.length > 0) {
        return events[events.length - 1];
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    throw new Error(`Timeout waiting for event: ${type}`);
  }
}

setWorldConstructor(AgentXWorld);
