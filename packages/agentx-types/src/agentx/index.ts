/**
 * AgentX Platform Contract Layer - Business Logic API
 *
 * "Define Once, Run Anywhere"
 *
 * ## ADR: Business Logic vs Infrastructure
 *
 * AgentX is the **business logic layer** - the central entry point for all agent operations.
 * It is **platform-agnostic** and **isomorphic**: same code runs on Server and Browser.
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    AgentX (Business Logic)                  │
 * │  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
 * │  │ DefinitionMgr   │ │   ImageMgr      │ │  SessionMgr   │  │
 * │  │  .register()    │ │  .getMetaImage()│ │  .create()    │  │
 * │  │  .get()         │ │  .list()        │ │  .get()       │  │
 * │  └─────────────────┘ └─────────────────┘ └───────────────┘  │
 * │                              │                              │
 * │                    uses Repository interface                │
 * └──────────────────────────────┼──────────────────────────────┘
 *                                │
 *          ┌─────────────────────┴─────────────────────┐
 *          │                                           │
 *          ▼                                           ▼
 * ┌─────────────────────┐                   ┌─────────────────────┐
 * │  SQLiteRepository   │                   │  RemoteRepository   │
 * │  (Server Runtime)   │                   │  (Browser Runtime)  │
 * └─────────────────────┘                   └─────────────────────┘
 * ```
 *
 * ## Two Roles
 *
 * 1. **Application Developer** - Uses AgentX
 *    - `defineAgent()` - Define agent template
 *    - `createAgentX(runtime)` - Create platform instance
 *    - `agentx.definitions.register()` - Register definition
 *    - `agentx.images.getMetaImage()` - Get genesis image
 *    - `agentx.sessions.create()` - Create user session
 *
 * 2. **Platform Developer** - Implements Runtime
 *    - NodeRuntime, SSERuntime (Browser)
 *    - SQLiteRepository, RemoteRepository
 *    - ClaudeDriver, SSEDriver
 *
 * ## Usage
 *
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-runtime";
 *
 * // 1. Define agent (source, like Dockerfile)
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * // 2. Create platform with runtime
 * const agentx = createAgentX(runtime);
 *
 * // 3. Register definition (auto-creates MetaImage)
 * agentx.definitions.register(MyAgent);
 *
 * // 4. Get MetaImage and create session
 * const metaImage = await agentx.images.getMetaImage("Translator");
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 * ```
 *
 * ## API Structure
 *
 * ```text
 * agentx
 * ├── .definitions.*   Definition registry (register, get, list)
 * ├── .images.*        Image management (getMetaImage, list)
 * ├── .sessions.*      Session management (create, get, list)
 * ├── .agents.*        Agent lifecycle (create, get, destroy)
 * └── .errors.*        Error handling
 * ```
 *
 * ## Why This Design?
 *
 * The key insight: **Business code should not know about infrastructure**.
 *
 * - `DefinitionManagerImpl` uses `Repository.saveDefinition()`, not SQLite directly
 * - `ImageManagerImpl` uses `Repository.findImageById()`, not HTTP directly
 * - Same Manager code works with SQLiteRepository (Server) or RemoteRepository (Browser)
 *
 * This is the "Dependency Inversion Principle" applied to cross-platform architecture.
 *
 * @see issues/022-runtime-agentx-isomorphic-architecture.md
 * @packageDocumentation
 */

// Main platform interfaces
export type { AgentX, AgentXLocal, AgentXRemote } from "./AgentX";

// Factory function - creates AgentX instance from Runtime
export { createAgentX } from "./createAgentX";

// defineAgent - defines agent template (source, like Dockerfile)
export type { DefineAgentInput } from "./defineAgent";
export { defineAgent } from "./defineAgent";

// Base Endpoint type
export type { Endpoint, HttpMethod } from "./Endpoint";

// Agent module (Manager + Endpoints)
export type {
  AgentManager,
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
} from "./agent";

// Error module (Local only)
export type { ErrorManager, ErrorHandler } from "./error";

// Session module (Manager + Endpoints)
export type {
  SessionManager,
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
} from "./session";

// Platform module (Manager + Endpoints)
export type {
  PlatformManager,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
} from "./platform";

// Definition module (Manager) - registry for agent definitions
export type { DefinitionManager } from "./definition";

// Image module (Manager) - manages MetaImage and DerivedImage
export type { ImageManager } from "./image";

// Provider types - dependency injection
export type { ProviderKey } from "./ProviderKey";
export { createProviderKey, LoggerFactoryKey } from "./ProviderKey";
