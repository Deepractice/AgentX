/**
 * @agentxjs/mirror - Peer-based relay node for AgentX
 *
 * Provides Mirror functionality for chain topology:
 * - Connect to upstream (Ecosystem or another Mirror)
 * - Serve downstream (Browser or another Mirror)
 * - Relay events bidirectionally
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                      MirrorEcosystem                         │
 * │  ┌─────────────────────────────────────────────────────────┐│
 * │  │                      SystemBus                           ││
 * │  └────────────────────────┬────────────────────────────────┘│
 * │            ▲              │              │                   │
 * │            │              │              ▼                   │
 * │  ┌─────────┴───────┐      │      ┌───────────────────┐      │
 * │  │  PeerReceptor   │      │      │   PeerEffector    │      │
 * │  │  (upstream →    │      │      │   (→ downstream)  │      │
 * │  │   SystemBus)    │      │      │                   │      │
 * │  └────────┬────────┘      │      └─────────┬─────────┘      │
 * │           │               │                │                 │
 * │  ┌────────┴───────────────┴────────────────┴────────┐       │
 * │  │                      Peer                         │       │
 * │  │  ┌──────────────┐          ┌───────────────────┐ │       │
 * │  │  │   Upstream   │          │    Downstream     │ │       │
 * │  │  │  (as client) │          │   (as server)     │ │       │
 * │  │  └──────────────┘          └───────────────────┘ │       │
 * │  └───────────────────────────────────────────────────┘       │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { createMirror } from "@agentxjs/mirror";
 *
 * // Full relay node
 * const mirror = createMirror({
 *   upstream: { url: "ws://ecosystem:5200" },
 *   downstream: { port: 5201 },
 * });
 *
 * await mirror.start();
 * // Ecosystem <- Mirror <- Browser
 *
 * // Client-only node
 * const client = createMirror({
 *   upstream: { url: "ws://mirror:5201" },
 * });
 *
 * await client.start();
 * ```
 *
 * @packageDocumentation
 */

// Main API
export { MirrorEcosystem, createMirror, type MirrorConfig } from "./MirrorEcosystem";

// Environment components (for advanced use)
export { PeerEnvironment, PeerReceptor, PeerEffector } from "./environment";

// SystemBus implementation
export { SystemBusImpl } from "./SystemBusImpl";
