/**
 * Application Server Types - HTTP server for Application layer
 *
 * Provides types for handling HTTP requests:
 * - ApplicationHandler: Framework-agnostic request handler
 * - Request/Response types for API contracts
 */

export type {
  ApplicationHandler,
  ApplicationHandlerOptions,
  ApplicationHandlerHooks,
  CorsOptions,
} from "./ApplicationHandler";

export type { ParsedRequest, RequestType } from "./RequestTypes";

export type {
  // Platform
  PlatformInfoResponse,
  HealthResponse,
  // Agent
  AgentListResponse,
  AgentInfoResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  RunImageResponse,
  ResumeSessionResponse,
  // Message
  SendMessageRequest,
  SendMessageResponse,
  InterruptResponse,
  // Error
  ErrorResponse,
  ApiErrorCode,
} from "./ResponseTypes";
