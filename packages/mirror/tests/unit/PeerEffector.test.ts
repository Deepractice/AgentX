import { describe, it, expect, vi, beforeEach } from "vitest";
import { PeerEffector } from "../../src/environment/PeerEffector";
import type {
  Peer,
  SystemBus,
  BusEventHandler,
  DownstreamConnection,
  DownstreamConnectionHandler,
  PeerServerStateHandler,
  EnvironmentEvent,
} from "@agentxjs/types";

/**
 * Create a mock Peer for testing
 */
function createMockPeer(): Peer & {
  triggerDownstreamConnection: (connection: DownstreamConnection) => void;
  triggerDownstreamStateChange: (state: string) => void;
  setUpstreamState: (state: string) => void;
  setDownstreamState: (state: string) => void;
} {
  let _upstreamState = "disconnected";
  let _downstreamState = "stopped";
  const downstreamConnectionHandlers: DownstreamConnectionHandler[] = [];
  const downstreamStateHandlers: PeerServerStateHandler[] = [];

  return {
    // Upstream
    get upstreamState() {
      return _upstreamState as any;
    },
    connectUpstream: vi.fn(),
    disconnectUpstream: vi.fn(),
    sendUpstream: vi.fn(),
    onUpstreamEvent: vi.fn(() => () => {}),
    onUpstreamStateChange: vi.fn(() => () => {}),

    // Downstream
    get downstreamState() {
      return _downstreamState as any;
    },
    downstreamConnections: [],
    listenDownstream: vi.fn(),
    closeDownstream: vi.fn(),
    broadcast: vi.fn(),
    onDownstreamConnection: vi.fn((handler: DownstreamConnectionHandler) => {
      downstreamConnectionHandlers.push(handler);
      return () => {
        const index = downstreamConnectionHandlers.indexOf(handler);
        if (index > -1) downstreamConnectionHandlers.splice(index, 1);
      };
    }),
    onDownstreamStateChange: vi.fn((handler: PeerServerStateHandler) => {
      downstreamStateHandlers.push(handler);
      return () => {
        const index = downstreamStateHandlers.indexOf(handler);
        if (index > -1) downstreamStateHandlers.splice(index, 1);
      };
    }),

    // Lifecycle
    dispose: vi.fn(),

    // Test helpers
    triggerDownstreamConnection: (connection: DownstreamConnection) => {
      downstreamConnectionHandlers.forEach((h) => h(connection));
    },
    triggerDownstreamStateChange: (state: string) => {
      downstreamStateHandlers.forEach((h) => h(state as any));
    },
    setUpstreamState: (state: string) => {
      _upstreamState = state;
    },
    setDownstreamState: (state: string) => {
      _downstreamState = state;
    },
  };
}

/**
 * Create a mock SystemBus for testing
 */
function createMockBus(): SystemBus & {
  triggerAny: (event: any) => void;
} {
  const anyHandlers: BusEventHandler[] = [];

  return {
    emit: vi.fn(),
    emitBatch: vi.fn(),
    on: vi.fn(() => () => {}),
    onAny: vi.fn((handler: BusEventHandler) => {
      anyHandlers.push(handler);
      return () => {
        const index = anyHandlers.indexOf(handler);
        if (index > -1) anyHandlers.splice(index, 1);
      };
    }),
    once: vi.fn(() => () => {}),
    destroy: vi.fn(),

    // Test helper
    triggerAny: (event: any) => {
      anyHandlers.forEach((h) => h(event));
    },
  };
}

/**
 * Create a mock DownstreamConnection for testing
 */
function createMockConnection(id: string): DownstreamConnection & {
  triggerEvent: (event: EnvironmentEvent) => void;
  triggerStateChange: (state: string) => void;
} {
  const eventHandlers: ((event: EnvironmentEvent) => void)[] = [];
  const stateHandlers: ((state: string) => void)[] = [];

  return {
    id,
    state: "connected",
    send: vi.fn(),
    disconnect: vi.fn(),
    onEvent: vi.fn((handler) => {
      eventHandlers.push(handler);
      return () => {
        const index = eventHandlers.indexOf(handler);
        if (index > -1) eventHandlers.splice(index, 1);
      };
    }),
    onStateChange: vi.fn((handler) => {
      stateHandlers.push(handler);
      return () => {
        const index = stateHandlers.indexOf(handler);
        if (index > -1) stateHandlers.splice(index, 1);
      };
    }),

    // Test helpers
    triggerEvent: (event: EnvironmentEvent) => {
      eventHandlers.forEach((h) => h(event));
    },
    triggerStateChange: (state: string) => {
      stateHandlers.forEach((h) => h(state));
    },
  };
}

describe("PeerEffector", () => {
  let peer: ReturnType<typeof createMockPeer>;
  let bus: ReturnType<typeof createMockBus>;
  let effector: PeerEffector;

  beforeEach(() => {
    peer = createMockPeer();
    bus = createMockBus();
    effector = new PeerEffector(peer);
  });

  describe("subscribe", () => {
    it("should register SystemBus onAny handler for transparent relay", () => {
      effector.subscribe(bus);

      expect(bus.onAny).toHaveBeenCalled();
    });

    it("should register downstream connection handler", () => {
      effector.subscribe(bus);

      expect(peer.onDownstreamConnection).toHaveBeenCalledTimes(1);
    });

    it("should register downstream state change handler", () => {
      effector.subscribe(bus);

      expect(peer.onDownstreamStateChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("downstream broadcast", () => {
    it("should broadcast events to downstream when listening", () => {
      peer.setDownstreamState("listening");
      effector.subscribe(bus);

      const event = {
        type: "text_delta",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { text: "hello" },
      };
      bus.triggerAny(event);

      expect(peer.broadcast).toHaveBeenCalledWith(event);
    });

    it("should not broadcast when downstream is not listening", () => {
      peer.setDownstreamState("stopped");
      effector.subscribe(bus);

      bus.triggerAny({
        type: "text_delta",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { text: "hello" },
      });

      expect(peer.broadcast).not.toHaveBeenCalled();
    });

    it("should broadcast any event type (transparent relay)", () => {
      peer.setDownstreamState("listening");
      effector.subscribe(bus);

      bus.triggerAny({ type: "message_start", data: {} });
      bus.triggerAny({ type: "custom_event", data: {} });
      bus.triggerAny({ type: "any_other_event", data: {} });

      expect(peer.broadcast).toHaveBeenCalledTimes(3);
    });
  });

  describe("upstream forwarding", () => {
    it("should forward any event from downstream to upstream (transparent relay)", () => {
      peer.setUpstreamState("connected");
      effector.subscribe(bus);

      const connection = createMockConnection("conn-1");
      peer.triggerDownstreamConnection(connection);

      const event: EnvironmentEvent = {
        type: "user_message",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { content: "hello" },
      };
      connection.triggerEvent(event);

      expect(peer.sendUpstream).toHaveBeenCalledWith(event);
    });

    it("should forward custom events from downstream to upstream", () => {
      peer.setUpstreamState("connected");
      effector.subscribe(bus);

      const connection = createMockConnection("conn-1");
      peer.triggerDownstreamConnection(connection);

      const event: EnvironmentEvent = {
        type: "custom_event",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { foo: "bar" },
      };
      connection.triggerEvent(event);

      expect(peer.sendUpstream).toHaveBeenCalledWith(event);
    });

    it("should not forward when upstream is not connected", () => {
      peer.setUpstreamState("disconnected");
      effector.subscribe(bus);

      const connection = createMockConnection("conn-1");
      peer.triggerDownstreamConnection(connection);

      connection.triggerEvent({
        type: "user_message",
        timestamp: Date.now(),
        turnId: "req-1",
        data: { content: "hello" },
      });

      expect(peer.sendUpstream).not.toHaveBeenCalled();
    });
  });

  describe("connection state events", () => {
    it("should emit downstream_connection_state on connection state change", () => {
      effector.subscribe(bus);

      const connection = createMockConnection("conn-1");
      peer.triggerDownstreamConnection(connection);

      connection.triggerStateChange("disconnected");

      expect(bus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "downstream_connection_state",
          data: expect.objectContaining({
            connectionId: "conn-1",
            state: "disconnected",
          }),
        })
      );
    });

    it("should emit connection_state on downstream server state change", () => {
      effector.subscribe(bus);

      peer.triggerDownstreamStateChange("listening");

      expect(bus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "connection_state",
          data: expect.objectContaining({
            direction: "downstream",
            state: "listening",
          }),
        })
      );
    });
  });
});
