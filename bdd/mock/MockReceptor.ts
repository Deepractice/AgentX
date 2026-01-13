/**
 * MockReceptor - Mock implementation of Receptor
 *
 * Receives mock events from MockEffector and emits to SystemBus.
 */

import type { Receptor } from "@agentxjs/types/runtime/internal/environment";
import type { SystemBusProducer, SystemEvent } from "@agentxjs/types/runtime/internal";

export class MockReceptor implements Receptor {
  private producer: SystemBusProducer | null = null;

  connect(producer: SystemBusProducer): void {
    this.producer = producer;
  }

  /**
   * Emit mock event to SystemBus
   * Called by MockEffector to simulate SDK events
   */
  emit(event: SystemEvent): void {
    if (this.producer) {
      this.producer.emit(event);
    }
  }
}
