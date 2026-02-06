"use client";

/**
 * useAgentX - React hook for AgentX client connection
 *
 * Manages the lifecycle of an agentxjs RemoteClient:
 * 1. Fetches WebSocket config from /api/chat/ws-config
 * 2. Creates RemoteClient and connects via WebSocket
 * 3. Creates a container for the current user
 * 4. Provides methods to create images (conversations) and send messages
 *
 * Data model mapping:
 * - Portagent "session" = AgentX "image" (a conversation template)
 * - Each image auto-creates an AgentX session for message history
 * - New chat = create new image + agent
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================================
// Local type definitions (mirroring agentxjs types to avoid importing the
// package statically, which would pull in Node.js dependencies at build time)
// ============================================================================

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
    }): Promise<{
      record: { imageId: string; sessionId: string };
    }>;
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
    ): PresentationLocal;
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

interface ConversationLocal {
  role: "user" | "assistant" | "error";
  blocks?: BlockLocal[];
  message?: string;
  isStreaming?: boolean;
}

export interface PresentationStateLocal {
  conversations: ConversationLocal[];
  streaming: {
    role: "assistant";
    blocks: BlockLocal[];
    isStreaming: boolean;
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
  agentId: string;
  sessionId: string;
  title: string;
  presentation: PresentationLocal;
}

export interface UseAgentXReturn {
  connected: boolean;
  sessions: AgentXSession[];
  activeSession: AgentXSession | null;
  presentationState: PresentationStateLocal;
  createSession: () => Promise<string | null>;
  selectSession: (imageId: string) => void;
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
  const mod = await import(/* webpackIgnore: true */ "agentxjs");
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
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<AgentXSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [presentationState, setPresentationState] = useState<PresentationStateLocal>(
    INITIAL_PRESENTATION_STATE
  );
  const [error, setError] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.imageId === activeSessionId) ?? null;

  // Initialize connection
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
        const { wsUrl, containerId } = await configRes.json();
        containerIdRef.current = containerId;

        const client = await createRemoteClient(wsUrl);

        if (disposed) {
          await client.dispose();
          return;
        }

        clientRef.current = client;
        setConnected(true);

        // Ensure container exists
        await client.containers.create(containerId);
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
  }, [userId]);

  // Create a new session (image + agent)
  const createSession = useCallback(async (): Promise<string | null> => {
    const client = clientRef.current;
    if (!client) return null;

    try {
      // Create a new image
      const imageRes = await client.images.create({
        containerId: containerIdRef.current,
        name: "New Chat",
        systemPrompt: "You are a helpful assistant.",
      });

      const imageId = imageRes.record.imageId;
      const sessionId = imageRes.record.sessionId;

      // Create an agent from the image
      const agentRes = await client.agents.create({ imageId });
      const agentId = agentRes.agentId;

      // Create a Presentation for this agent
      const presentation = client.presentations.create(agentId, {
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

      return imageId;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  // Select a session
  const selectSession = useCallback(
    (imageId: string) => {
      setActiveSessionId(imageId);
      // Restore presentation state for this session
      const session = sessions.find((s) => s.imageId === imageId);
      if (session) {
        setPresentationState(session.presentation.getState());
      }
    },
    [sessions]
  );

  // Send a message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!activeSession) return;

      try {
        await activeSession.presentation.send(text);

        // Update session title if it's still the default
        setSessions((prev) =>
          prev.map((s) => {
            if (s.imageId !== activeSession.imageId) return s;
            if (s.title === "New Chat") {
              const title = text.length > 20 ? text.slice(0, 20) + "..." : text;
              return { ...s, title };
            }
            return s;
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [activeSession]
  );

  return {
    connected,
    sessions,
    activeSession,
    presentationState,
    createSession,
    selectSession,
    sendMessage,
    error,
  };
}
