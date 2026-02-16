"use client";

/**
 * useAgentX - React hook for AgentX client connection
 *
 * Manages the lifecycle of an agentxjs RemoteClient:
 * 1. Fetches WebSocket config from /api/chat/ws-config
 * 2. Creates RemoteClient and connects via WebSocket
 * 3. Creates a container for the current user
 * 4. Loads existing images (sessions) from the server
 * 5. Provides methods to create images (conversations) and send messages
 *
 * Data model mapping:
 * - Portagent "session" = AgentX "image" (a conversation template)
 * - Each image auto-creates an AgentX session for message history
 * - New chat = create new image + agent
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================================
// Local type definitions (mirroring agentxjs types to avoid importing the
// package statically, which would pull in Node.js dependencies at build time)
// ============================================================================

interface ImageRecord {
  imageId: string;
  containerId: string;
  sessionId: string;
  name?: string;
  customData?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

interface AgentXClient {
  connected: boolean;
  containers: {
    create(containerId: string): Promise<{ containerId: string }>;
  };
  images: {
    create(params: {
      containerId: string;
      name?: string;
      systemPrompt?: string;
      customData?: Record<string, unknown>;
    }): Promise<{
      record: { imageId: string; sessionId: string };
    }>;
    list(containerId?: string): Promise<{
      records: ImageRecord[];
    }>;
    update(
      imageId: string,
      updates: { name?: string; customData?: Record<string, unknown> }
    ): Promise<{
      record: ImageRecord;
    }>;
    delete(imageId: string): Promise<{ requestId: string }>;
  };
  agents: {
    create(params: { imageId: string }): Promise<{
      agentId: string;
    }>;
  };
  presentations: {
    create(
      agentId: string,
      options?: {
        onUpdate?: (state: PresentationStateLocal) => void;
        onError?: (error: Error) => void;
      }
    ): Promise<PresentationLocal>;
  };
  dispose(): Promise<void>;
}

interface PresentationLocal {
  send(content: string): Promise<void>;
  getState(): PresentationStateLocal;
  dispose(): void;
}

interface TextBlockLocal {
  type: "text";
  content: string;
}

interface ToolBlockLocal {
  type: "tool";
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  status: string;
}

type BlockLocal = TextBlockLocal | ToolBlockLocal | { type: string };

interface TokenUsageLocal {
  inputTokens: number;
  outputTokens: number;
}

interface ConversationLocal {
  role: "user" | "assistant" | "error";
  blocks?: BlockLocal[];
  message?: string;
  isStreaming?: boolean;
  usage?: TokenUsageLocal;
}

export type { TokenUsageLocal };

export interface PresentationStateLocal {
  conversations: ConversationLocal[];
  streaming: {
    role: "assistant";
    blocks: BlockLocal[];
    isStreaming: boolean;
    usage?: TokenUsageLocal;
  } | null;
  status: "idle" | "thinking" | "responding" | "executing";
}

// ============================================================================
// Hook types
// ============================================================================

interface UseAgentXOptions {
  userId: string;
}

export interface AgentXSession {
  imageId: string;
  sessionId: string;
  title: string;
  pinned?: boolean;
  renamed?: boolean;
  // Lazily loaded when session is selected
  agentId?: string;
  presentation?: PresentationLocal;
}

export interface UseAgentXReturn {
  connected: boolean;
  sessions: AgentXSession[];
  activeSession: AgentXSession | null;
  presentationState: PresentationStateLocal;
  createSession: () => Promise<AgentXSession | null>;
  selectSession: (imageId: string) => void;
  deleteSession: (imageId: string) => Promise<void>;
  pinSession: (imageId: string) => Promise<void>;
  renameSession: (imageId: string, newTitle: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  error: string | null;
}

const INITIAL_PRESENTATION_STATE: PresentationStateLocal = {
  conversations: [],
  streaming: null,
  status: "idle",
};

// ============================================================================
// Dynamic import helper
// ============================================================================

async function createRemoteClient(wsUrl: string): Promise<AgentXClient> {
  // Use dynamic import with webpackIgnore to prevent webpack from analyzing
  // the agentxjs module tree (which includes Node.js-only dependencies)
  const mod = await import("agentxjs");
  const client = await mod.createAgentX({
    serverUrl: wsUrl,
    timeout: 120000,
  });
  return client as unknown as AgentXClient;
}

// ============================================================================
// Hook implementation
// ============================================================================

export function useAgentX({ userId }: UseAgentXOptions): UseAgentXReturn {
  const clientRef = useRef<AgentXClient | null>(null);
  const containerIdRef = useRef<string>(`user-${userId}`);
  const systemPromptRef = useRef<string>("You are a helpful assistant.");
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<AgentXSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [presentationState, setPresentationState] = useState<PresentationStateLocal>(
    INITIAL_PRESENTATION_STATE
  );
  const [error, setError] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.imageId === activeSessionId) ?? null;

  // Initialize connection and load existing sessions
  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        // Fetch WS config from API
        const configRes = await fetch("/api/chat/ws-config");
        if (!configRes.ok) {
          setError("Failed to get WebSocket config");
          return;
        }
        const { wsUrl, containerId, systemPrompt } = await configRes.json();
        containerIdRef.current = containerId;
        if (systemPrompt) systemPromptRef.current = systemPrompt;

        const client = await createRemoteClient(wsUrl);

        if (disposed) {
          await client.dispose();
          return;
        }

        clientRef.current = client;
        setConnected(true);

        // Ensure container exists
        await client.containers.create(containerId);

        // Load existing images (sessions) from server
        const imageRes = await client.images.list(containerId);
        if (disposed) return;

        if (imageRes.records.length > 0) {
          const restored: AgentXSession[] = imageRes.records
            .sort((a, b) => {
              // Pinned first, then by updatedAt
              const aPinned = a.customData?.pinned ? 1 : 0;
              const bPinned = b.customData?.pinned ? 1 : 0;
              if (aPinned !== bPinned) return bPinned - aPinned;
              return b.updatedAt - a.updatedAt;
            })
            .map((record) => ({
              imageId: record.imageId,
              sessionId: record.sessionId,
              title: record.name || "Chat",
              pinned: !!record.customData?.pinned,
              renamed: !!record.customData?.renamed,
            }));
          setSessions(restored);
        }
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    init();

    return () => {
      disposed = true;
      if (clientRef.current) {
        clientRef.current.dispose();
        clientRef.current = null;
        setConnected(false);
      }
    };
  }, []);

  // Activate a session: create agent + presentation if not yet loaded
  const activateSession = useCallback(
    async (imageId: string): Promise<AgentXSession | null> => {
      const client = clientRef.current;
      if (!client) return null;

      const session = sessions.find((s) => s.imageId === imageId);
      if (!session) return null;

      // Already loaded
      if (session.agentId && session.presentation) {
        setPresentationState(session.presentation.getState());
        return session;
      }

      try {
        // Create agent for this image (resumes existing session history)
        const agentRes = await client.agents.create({ imageId });
        const agentId = agentRes.agentId;

        // Create presentation (loads history from session)
        const presentation = await client.presentations.create(agentId, {
          onUpdate: (state) => {
            setPresentationState(state);
          },
          onError: (err) => {
            setError(err.message);
          },
        });

        const loaded: AgentXSession = { ...session, agentId, presentation };

        setSessions((prev) => prev.map((s) => (s.imageId === imageId ? loaded : s)));
        setPresentationState(presentation.getState());

        return loaded;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      }
    },
    [sessions]
  );

  // Create a new session (image + agent)
  const createSession = useCallback(async (): Promise<AgentXSession | null> => {
    const client = clientRef.current;
    if (!client) return null;

    try {
      // Create a new image
      const imageRes = await client.images.create({
        containerId: containerIdRef.current,
        name: "New Chat",
        systemPrompt: systemPromptRef.current,
      });

      const imageId = imageRes.record.imageId;
      const sessionId = imageRes.record.sessionId;

      // Create an agent from the image
      const agentRes = await client.agents.create({ imageId });
      const agentId = agentRes.agentId;

      // Create a Presentation for this agent
      const presentation = await client.presentations.create(agentId, {
        onUpdate: (state) => {
          setPresentationState(state);
        },
        onError: (err) => {
          setError(err.message);
        },
      });

      const newSession: AgentXSession = {
        imageId,
        agentId,
        sessionId,
        title: "New Chat",
        presentation,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(imageId);
      setPresentationState(INITIAL_PRESENTATION_STATE);

      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  // Select a session (lazy-loads agent + presentation)
  const selectSession = useCallback(
    (imageId: string) => {
      setActiveSessionId(imageId);

      const session = sessions.find((s) => s.imageId === imageId);
      if (session?.presentation) {
        // Already loaded, just restore state
        setPresentationState(session.presentation.getState());
      } else {
        // Need to load agent + presentation
        setPresentationState(INITIAL_PRESENTATION_STATE);
        activateSession(imageId);
      }
    },
    [sessions, activateSession]
  );

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeSession?.presentation) return;
      const client = clientRef.current;

      try {
        await activeSession.presentation.send(text);

        // Auto-update title if not manually renamed
        if (!activeSession.renamed) {
          const title = text.length > 30 ? `${text.slice(0, 30)}...` : text;
          setSessions((prev) =>
            prev.map((s) => (s.imageId === activeSession.imageId ? { ...s, title } : s))
          );
          // Sync to AgentX
          client?.images.update(activeSession.imageId, { name: title }).catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [activeSession]
  );

  // Delete a session
  const deleteSession = useCallback(
    async (imageId: string) => {
      const client = clientRef.current;
      if (!client) return;

      try {
        const session = sessions.find((s) => s.imageId === imageId);
        if (session?.presentation) {
          session.presentation.dispose();
        }

        await client.images.delete(imageId);

        setSessions((prev) => prev.filter((s) => s.imageId !== imageId));

        // If deleting active session, clear state
        if (activeSessionId === imageId) {
          setActiveSessionId(null);
          setPresentationState(INITIAL_PRESENTATION_STATE);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [sessions, activeSessionId]
  );

  // Pin/unpin a session
  const pinSession = useCallback(
    async (imageId: string) => {
      const client = clientRef.current;
      if (!client) return;

      const session = sessions.find((s) => s.imageId === imageId);
      if (!session) return;

      const newPinned = !session.pinned;
      try {
        await client.images.update(imageId, {
          customData: { pinned: newPinned, renamed: session.renamed || false },
        });

        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.imageId === imageId ? { ...s, pinned: newPinned } : s
          );
          // Re-sort: pinned first, then by position
          return updated.sort((a, b) => {
            const ap = a.pinned ? 1 : 0;
            const bp = b.pinned ? 1 : 0;
            return bp - ap;
          });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [sessions]
  );

  // Rename a session
  const renameSession = useCallback(
    async (imageId: string, newTitle: string) => {
      const client = clientRef.current;
      if (!client) return;

      const session = sessions.find((s) => s.imageId === imageId);
      if (!session) return;

      try {
        await client.images.update(imageId, {
          name: newTitle,
          customData: { pinned: session.pinned || false, renamed: true },
        });

        setSessions((prev) =>
          prev.map((s) => (s.imageId === imageId ? { ...s, title: newTitle, renamed: true } : s))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [sessions]
  );

  return {
    connected,
    sessions,
    activeSession,
    presentationState,
    createSession,
    selectSession,
    deleteSession,
    pinSession,
    renameSession,
    sendMessage,
    error,
  };
}
