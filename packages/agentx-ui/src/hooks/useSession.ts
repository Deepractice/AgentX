/**
 * useSession - React hook for Session management
 *
 * Maps to agentx.sessions API. Provides reactive state for session list,
 * current selection, and session operations.
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5).
 *
 * @example
 * ```tsx
 * import { useSession } from "@deepractice-ai/agentx-ui";
 *
 * function SessionList({ agentx, userId }) {
 *   const {
 *     sessions,
 *     currentSession,
 *     selectSession,
 *     createSession,
 *     isLoading,
 *   } = useSession(agentx, userId);
 *
 *   return (
 *     <div>
 *       {sessions.map(s => (
 *         <SessionItem
 *           key={s.sessionId}
 *           session={s}
 *           selected={s.sessionId === currentSession?.sessionId}
 *           onClick={() => selectSession(s)}
 *         />
 *       ))}
 *       <button onClick={() => createSession(imageId)}>New</button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from "react";
import type { AgentX, Session } from "@deepractice-ai/agentx-types";
import type { SessionItem } from "~/components/container/types";

// Re-export SessionItem for convenience (primary export is from container/types)
export type { SessionItem } from "~/components/container/types";

/**
 * Return type of useSession hook
 */
export interface UseSessionResult {
  /**
   * All sessions for the current user
   */
  sessions: SessionItem[];

  /**
   * Currently selected session
   */
  currentSession: SessionItem | null;

  /**
   * Select a session
   */
  selectSession: (session: SessionItem | null) => void;

  /**
   * Create a new session
   */
  createSession: (imageId: string, title?: string) => Promise<SessionItem>;

  /**
   * Delete a session
   */
  deleteSession: (sessionId: string) => Promise<void>;

  /**
   * Update session title
   */
  setSessionTitle: (sessionId: string, title: string) => Promise<void>;

  /**
   * Refresh sessions from server
   */
  refresh: () => Promise<void>;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;
}

/**
 * Options for useSession hook
 */
export interface UseSessionOptions {
  /**
   * Auto-load sessions on mount
   * @default true
   */
  autoLoad?: boolean;

  /**
   * Callback when session selection changes
   */
  onSessionChange?: (session: SessionItem | null) => void;

  /**
   * Callback when sessions list changes
   */
  onSessionsChange?: (sessions: SessionItem[]) => void;
}

/**
 * Convert Session to SessionItem
 */
function toSessionItem(session: Session): SessionItem {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    imageId: session.imageId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * React hook for session management
 *
 * Maps to agentx.sessions API.
 *
 * @param agentx - AgentX instance
 * @param userId - Current user ID
 * @param options - Optional configuration
 * @returns Session state and operations
 */
export function useSession(
  agentx: AgentX | null,
  userId: string,
  options: UseSessionOptions = {}
): UseSessionResult {
  const { autoLoad = true, onSessionChange, onSessionsChange } = options;

  // State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load sessions from server
  const loadSessions = useCallback(async () => {
    if (!agentx || !("sessions" in agentx)) return;

    setIsLoading(true);
    setError(null);

    try {
      const sessionList = await agentx.sessions.listByUser(userId);
      const items = sessionList.map(toSessionItem);
      setSessions(items);
      onSessionsChange?.(items);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [agentx, userId, onSessionsChange]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadSessions();
    }
  }, [autoLoad, loadSessions]);

  // Select session
  const selectSession = useCallback(
    (session: SessionItem | null) => {
      setCurrentSession(session);
      onSessionChange?.(session);
    },
    [onSessionChange]
  );

  // Create session
  const createSession = useCallback(
    async (imageId: string, title?: string): Promise<SessionItem> => {
      if (!agentx || !("sessions" in agentx)) {
        throw new Error("AgentX sessions not available");
      }

      setIsLoading(true);
      setError(null);

      try {
        const session = await agentx.sessions.create(imageId, userId);
        if (title) {
          await session.setTitle(title);
        }

        const item = toSessionItem(session);
        setSessions((prev) => [item, ...prev]);
        setCurrentSession(item);
        onSessionChange?.(item);
        onSessionsChange?.([item, ...sessions]);

        return item;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [agentx, userId, sessions, onSessionChange, onSessionsChange]
  );

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!agentx || !("sessions" in agentx)) {
        throw new Error("AgentX sessions not available");
      }

      setIsLoading(true);
      setError(null);

      try {
        await agentx.sessions.destroy(sessionId);

        const newSessions = sessions.filter((s) => s.sessionId !== sessionId);
        setSessions(newSessions);
        onSessionsChange?.(newSessions);

        // Clear current if deleted
        if (currentSession?.sessionId === sessionId) {
          setCurrentSession(null);
          onSessionChange?.(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [agentx, sessions, currentSession, onSessionChange, onSessionsChange]
  );

  // Set session title
  const setSessionTitle = useCallback(
    async (sessionId: string, title: string): Promise<void> => {
      if (!agentx || !("sessions" in agentx)) {
        throw new Error("AgentX sessions not available");
      }

      setError(null);

      try {
        const session = await agentx.sessions.get(sessionId);
        if (session) {
          await session.setTitle(title);

          // Update local state
          const now = Date.now();
          setSessions((prev) =>
            prev.map((s) => (s.sessionId === sessionId ? { ...s, title, updatedAt: now } : s))
          );

          if (currentSession?.sessionId === sessionId) {
            setCurrentSession((prev) => (prev ? { ...prev, title, updatedAt: now } : prev));
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [agentx, currentSession]
  );

  return {
    sessions,
    currentSession,
    selectSession,
    createSession,
    deleteSession,
    setSessionTitle,
    refresh: loadSessions,
    isLoading,
    error,
  };
}
