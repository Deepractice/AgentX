/**
 * Application Module - Static Resources
 *
 * Contains static resources that don't change during runtime:
 * - Definition: Agent blueprint (like Dockerfile)
 * - Image: Built artifact (like Docker Image)
 * - User: User identity
 *
 * These are managed via HTTP CRUD operations.
 * Dynamic resources (Container, Session, Agent) belong to Runtime layer.
 *
 * @packageDocumentation
 */

// Data types
export * from "./definition";
export * from "./image";
export * from "./user";

// Facades
export * from "./facade";
