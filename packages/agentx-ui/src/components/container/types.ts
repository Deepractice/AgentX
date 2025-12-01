/**
 * Container Component Types
 *
 * UI-specific types extending core agentx-types for display purposes.
 */

import type { AgentDefinition } from "@deepractice-ai/agentx-types";

/**
 * Session item for UI display (pure data, no methods)
 *
 * Core fields come from Session interface (Docker-style architecture).
 * Additional fields (preview, unreadCount) are computed/derived by UI.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (userId + imageId)
 */
export interface SessionItem {
  /**
   * Unique session identifier
   */
  sessionId: string;

  /**
   * Owner user ID
   */
  userId: string;

  /**
   * Associated image ID (frozen runtime snapshot)
   */
  imageId: string;

  /**
   * Display title (can be AI-generated summary)
   */
  title: string | null;

  /**
   * Session creation timestamp (Unix ms)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix ms)
   */
  updatedAt: number;

  // ===== UI computed fields (not from Session) =====

  /**
   * Preview text (last message snippet) - computed from messages
   */
  preview?: string;

  /**
   * Unread message count - computed by UI
   */
  unreadCount?: number;
}

/**
 * Extended AgentDefinition with UI metadata
 */
export interface AgentDefinitionItem extends AgentDefinition {
  /**
   * Icon identifier or emoji
   */
  icon?: string;

  /**
   * Badge color for visual distinction
   */
  color?: string;

  /**
   * Whether this agent is online/available
   */
  isOnline?: boolean;

  /**
   * Number of active sessions
   */
  activeSessionCount?: number;
}
