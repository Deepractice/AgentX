/**
 * ResponseTypes - HTTP response types for Application layer
 */

/**
 * Platform info response
 */
export interface PlatformInfoResponse {
  platform: "AgentX";
  version: string;
  agentCount: number;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  agentCount: number;
}

/**
 * Agent list response
 */
export interface AgentListResponse {
  agents: AgentInfoResponse[];
}

/**
 * Agent info response
 */
export interface AgentInfoResponse {
  agentId: string;
  name: string;
  description?: string;
  lifecycle: string;
  state: string;
  createdAt: number;
}

/**
 * Create agent request
 */
export interface CreateAgentRequest {
  /**
   * Definition name (must be registered)
   */
  definition: string;

  /**
   * Agent configuration
   */
  config?: Record<string, unknown>;

  /**
   * Optional agent ID (auto-generated if not provided)
   */
  agentId?: string;
}

/**
 * Create agent response
 */
export interface CreateAgentResponse {
  agentId: string;
  name: string;
  lifecycle: string;
  state: string;
  createdAt: number;
  endpoints: {
    sse: string;
    messages: string;
    interrupt: string;
  };
}

/**
 * Run image response (same as create agent response)
 */
export type RunImageResponse = CreateAgentResponse;

/**
 * Resume session response (same as create agent response)
 */
export type ResumeSessionResponse = CreateAgentResponse;

/**
 * Send message request
 */
export interface SendMessageRequest {
  /**
   * Message content
   */
  content: string | unknown[];
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  status: "processing";
}

/**
 * Interrupt response
 */
export interface InterruptResponse {
  interrupted: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * API error codes for HTTP responses
 */
export type ApiErrorCode =
  | "AGENT_NOT_FOUND"
  | "AGENT_BUSY"
  | "AGENT_DESTROYED"
  | "INVALID_REQUEST"
  | "DEFINITION_NOT_FOUND"
  | "IMAGE_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "CONTAINER_NOT_FOUND"
  | "DYNAMIC_CREATION_DISABLED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";
