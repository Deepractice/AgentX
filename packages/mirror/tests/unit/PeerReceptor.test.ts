import { describe, it, expect, vi, beforeEach } from "vitest";
import { PeerReceptor } from "../../src/environment/PeerReceptor";
import type { Peer, SystemBus, PeerEventHandler, PeerStateHandler, EnvironmentEvent } from "@agentxjs/types";

/**
 * Create a mock Peer for testing
 */
function createMockPeer(): Peer & {
  triggerUpstreamEvent: (event: EnvironmentEvent) => void;
  triggerUpstreamStateChange: (state: string) => void;
} {
  const upstreamEventHandlers: PeerEventHandler[] = [];
  const upstreamStateHandlers: PeerStateHandler[] = [];

  return {
    // Upstream
    upstreamState: "disconnected",
    connectUpstream: vi.fn(),
    disconnectUpstream: vi.fn(),
    sendUpstream: vi.fn(),
    onUpstreamEvent: vi.fn((handler: PeerEventHandler) => {
      upstreamEventHandlers.push(handler);
      return () => {
        const index = upstreamEventHandlers.indexOf(handler);
        if (index > -1) upstreamEventHandlers.splice(index, 1);
      };
    }),
    onUpstreamStateChange: vi.fn((handler: PeerStateHandler) => {
      upstreamStateHandlers.push(handler);
      return () => {
        const index = upstreamStateHandlers.indexOf(handler);
        if (index > -1) upstreamStateHandlers.splice(index, 1);
      };
    }),

    // Downstream
    downstreamState: "stopped",
    downstreamConnections: [],
    listenDownstream: vi.fn(),
    closeDownstream: vi.fn(),
    broadcast: vi.fn(),
    onDownstreamConnection: vi.fn(),
    onDownstreamStateChange: vi.fn(),

    // Lifecycle
    dispose: vi.fn(),

    // Test helpers
    triggerUpstreamEvent: (event: EnvironmentEvent) => {
      upstreamEventHandlers.forEach((h) => h(event));
    },
    triggerUpstreamStateChange: (state: string) => {
      upstreamStateHandlers.forEach((h) => h(state as any));
    },
  };
}

/**
 * Create a mock SystemBus for testing
 */
function createMockBus(): SystemBus {
  return {
    emit: vi.fn(),
    emitBatch: vi.fn(),
    on: vi.fn(() => () => {}),
    onAny: vi.fn(() => () => {}),
    once: vi.fn(() => () => {}),
    destroy: vi.fn(),
  };
}

describe("PeerReceptor", () => {
  let peer: ReturnType<typeof createMockPeer>;
  let bus: SystemBus;
  let receptor: PeerReceptor;

  beforeEach(() => {
    peer = createMockPeer();
    bus = createMockBus();
    receptor = new PeerReceptor(peer);
  });

  describe("emit", () => {
    it("should register upstream event handler", () => {
      receptor.emit(bus);

      expect(peer.onUpstreamEvent).toHaveBeenCalledTimes(1);
    });

    it("should register upstream state change handler", () => {
      receptor.emit(bus);

      expect(peer.onUpstreamStateChange).toHaveBeenCalledTimes(1);
    });

    it("should forward upstream events to SystemBus", () => {
      receptor.emit(bus);

      const event: EnvironmentEvent = {
        type: "text_delta",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { text: "hello" },
      };
      peer.triggerUpstreamEvent(event);

      expect(bus.emit).toHaveBeenCalledWith(event);
    });

    it("should forward multiple upstream events", () => {
      receptor.emit(bus);

      peer.triggerUpstreamEvent({
        type: "message_start",
        timestamp: Date.now(),
        turnId: "req-1",
        data: {},
      });
      peer.triggerUpstreamEvent({
        type: "text_delta",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { text: "hi" },
      });
      peer.triggerUpstreamEvent({
        type: "message_stop",
        timestamp: Date.now(),
        turnId: "req-1",
        data: {},
      });

      expect(bus.emit).toHaveBeenCalledTimes(3);
    });

    it("should emit connection_state event on upstream state change", () => {
      receptor.emit(bus);

      peer.triggerUpstreamStateChange("connected");

      expect(bus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "connection_state",
          data: expect.objectContaining({
            direction: "upstream",
            state: "connected",
          }),
        })
      );
    });
  });
});
