import { describe, it, expect, vi, beforeEach } from "vitest";
import { MirrorEcosystem, createMirror } from "../../src/MirrorEcosystem";

// Mock @agentxjs/network
vi.mock("@agentxjs/network", () => ({
  createWebSocketPeer: vi.fn(() => ({
    upstreamState: "disconnected",
    downstreamState: "stopped",
    downstreamConnections: [],
    connectUpstream: vi.fn().mockResolvedValue(undefined),
    disconnectUpstream: vi.fn(),
    sendUpstream: vi.fn(),
    onUpstreamEvent: vi.fn(() => () => {}),
    onUpstreamStateChange: vi.fn(() => () => {}),
    listenDownstream: vi.fn().mockResolvedValue(undefined),
    closeDownstream: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn(),
    onDownstreamConnection: vi.fn(() => () => {}),
    onDownstreamStateChange: vi.fn(() => () => {}),
    dispose: vi.fn(),
  })),
}));

describe("MirrorEcosystem", () => {
  describe("constructor", () => {
    it("should create with upstream config", () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      expect(mirror.bus).toBeDefined();
      expect(mirror.peer).toBeDefined();
      expect(mirror.environment).toBeDefined();
    });

    it("should create with upstream and downstream config", () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
        downstream: { port: 5201 },
      });

      expect(mirror.bus).toBeDefined();
      expect(mirror.peer).toBeDefined();
    });
  });

  describe("state properties", () => {
    it("should expose upstreamState", () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      expect(mirror.upstreamState).toBe("disconnected");
    });

    it("should expose downstreamState", () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      expect(mirror.downstreamState).toBe("stopped");
    });
  });

  describe("start", () => {
    it("should connect to upstream", async () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      await mirror.start();

      expect(mirror.peer.connectUpstream).toHaveBeenCalledWith({
        url: "ws://localhost:5200",
      });
    });

    it("should start downstream server when configured", async () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
        downstream: { port: 5201 },
      });

      await mirror.start();

      expect(mirror.peer.connectUpstream).toHaveBeenCalled();
      expect(mirror.peer.listenDownstream).toHaveBeenCalledWith({ port: 5201 });
    });

    it("should not start downstream server when not configured", async () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      await mirror.start();

      expect(mirror.peer.listenDownstream).not.toHaveBeenCalled();
    });
  });

  describe("stop", () => {
    it("should disconnect upstream", async () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      await mirror.stop();

      expect(mirror.peer.disconnectUpstream).toHaveBeenCalled();
    });

    it("should close downstream when configured", async () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
        downstream: { port: 5201 },
      });

      await mirror.stop();

      expect(mirror.peer.closeDownstream).toHaveBeenCalled();
      expect(mirror.peer.disconnectUpstream).toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("should dispose peer and destroy bus", () => {
      const mirror = new MirrorEcosystem({
        upstream: { url: "ws://localhost:5200" },
      });

      const destroySpy = vi.spyOn(mirror.bus, "destroy");

      mirror.dispose();

      expect(mirror.peer.dispose).toHaveBeenCalled();
      expect(destroySpy).toHaveBeenCalled();
    });
  });
});

describe("createMirror", () => {
  it("should return MirrorEcosystem instance", () => {
    const mirror = createMirror({
      upstream: { url: "ws://localhost:5200" },
    });

    expect(mirror).toBeInstanceOf(MirrorEcosystem);
  });

  it("should support relay configuration", () => {
    const mirror = createMirror({
      upstream: { url: "ws://ecosystem:5200" },
      downstream: { port: 5201, host: "0.0.0.0" },
    });

    expect(mirror).toBeInstanceOf(MirrorEcosystem);
  });

  it("should support client-only configuration", () => {
    const mirror = createMirror({
      upstream: { url: "ws://mirror:5201" },
    });

    expect(mirror).toBeInstanceOf(MirrorEcosystem);
  });
});
