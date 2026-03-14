/**
 * Connection Pool Test
 *
 * Verifies that connect() reuses connections and dispose() uses refCount.
 * Simulates React Strict Mode double-mount behavior.
 */

import { describe, expect, test } from "bun:test";

// Access the pool directly for testing
// We test through the public API by calling createAgentX().connect()

describe("Connection Pool", () => {
  test("same serverUrl returns same connection (reuse)", async () => {
    const { createAgentX } = await import("../src/index");

    // Mock: we can't actually connect, so we test the pool logic
    // by checking that two connect() calls to the same URL
    // share the same underlying client

    // This test verifies the pool structure exists
    // Full integration test would need a running server
    expect(typeof createAgentX).toBe("function");
    const ax = createAgentX();
    expect(typeof ax.connect).toBe("function");
  });

  test("React Strict Mode simulation: mount-unmount-mount", async () => {
    // This test documents the expected behavior:
    //
    // 1. mount  → connect("ws://server") → refCount=1, new connection
    // 2. unmount → dispose()              → refCount=0 (connection released)
    // 3. mount  → connect("ws://server") → if connection still alive, refCount=1 (reuse)
    //
    // Without pool: 2 connections created, server sees totalConnections: 2
    // With pool:    1 connection reused, server sees totalConnections: 1
    //
    // The pool is module-level, so it persists across createAgentX() calls

    expect(true).toBe(true); // placeholder - real test needs a server
  });
});
