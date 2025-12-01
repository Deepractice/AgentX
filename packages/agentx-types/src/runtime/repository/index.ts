/**
 * Repository Module - Isomorphic Storage Abstraction
 *
 * ## ADR: Key to Isomorphic Storage
 *
 * Repository is the core of AgentX isomorphic architecture. It defines a unified
 * storage interface that enables business code to seamlessly switch between
 * Server and Browser.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                   Repository Interface                      │
 * │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
 * │  │  Definition  │ │    Image     │ │      Session         │ │
 * │  │   methods    │ │   methods    │ │      methods         │ │
 * │  │  (in-memory) │ │ (persisted)  │ │    (persisted)       │ │
 * │  └──────────────┘ └──────────────┘ └──────────────────────┘ │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *          ┌───────────────────┴───────────────────┐
 *          │                                       │
 *          ▼                                       ▼
 * ┌─────────────────────┐               ┌─────────────────────┐
 * │  SQLiteRepository   │               │  RemoteRepository   │
 * │  (agentx-node)      │               │  (agentx/client)    │
 * │                     │               │                     │
 * │  Definition: Map    │               │  Definition: HTTP   │
 * │  Image: SQLite      │   ◄──HTTP──►  │  Image: HTTP        │
 * │  Session: SQLite    │               │  Session: HTTP      │
 * └─────────────────────┘               └─────────────────────┘
 *        Server                                Browser
 * ```
 *
 * ## Why Definition Uses In-Memory?
 *
 * Definition is like Dockerfile, a source-level configuration:
 * - Defined in code (`defineAgent({ name: "xxx" })`)
 * - No need to persist to database
 * - But Repository interface supports persistence (for future Definition marketplace)
 *
 * ## Data Flow Example
 *
 * ### Server Side
 * ```
 * agentx.definitions.register(def)
 *   → DefinitionManagerImpl.register()
 *     → SQLiteRepository.saveDefinition()  // Map.set()
 *     → SQLiteRepository.saveImage()       // INSERT INTO images
 * ```
 *
 * ### Browser Side
 * ```
 * agentx.definitions.register(def)
 *   → DefinitionManagerImpl.register()
 *     → RemoteRepository.saveDefinition()  // PUT /definitions/:name
 *       → Server Handler
 *         → SQLiteRepository.saveDefinition()
 * ```
 *
 * ## Docker-style Layering
 *
 * ```
 * Definition (source, code-defined)
 *     │
 *     └──[register]──→ MetaImage (persisted, auto-created)
 *                          │
 *                          └──→ Session (persisted, user-created)
 *                                   │
 *                                   └──[commit]──→ DerivedImage (persisted)
 * ```
 *
 * ## Record Types
 *
 * | Record           | Persisted | Description                         |
 * |------------------|-----------|-------------------------------------|
 * | DefinitionRecord | In-memory | Source layer, like Dockerfile       |
 * | ImageRecord      | Database  | Build artifact, has type (meta/derived) |
 * | SessionRecord    | Database  | User session, references imageId    |
 *
 * @see issues/022-runtime-agentx-isomorphic-architecture.md
 * @packageDocumentation
 */

// Repository interface - unified storage abstraction
export type { Repository } from "./Repository";

// Record types (storage schema)
// These types are used for both SQLite schema and HTTP API contract
export * from "./record";
