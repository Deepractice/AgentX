/**
 * Studio - Integration layer for multi-agent chat UI
 *
 * Studio is the ONLY frontend-specific concept in the UI architecture.
 * It integrates:
 * - useSession hook (maps to agentx.sessions)
 * - useAgent hook (maps to agentx.agents)
 * - ContainerView (pure UI layout)
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5):
 * - UI types mirror agentx-types
 * - Naming follows backend (session, not topic)
 * - No invented concepts except Studio
 *
 * @example
 * ```tsx
 * import { Studio } from "@agentxjs/ui";
 *
 * function App() {
 *   return (
 *     <Studio
 *       agentx={agentx}
 *       userId="user_123"
 *       definitions={definitions}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import type { AgentX, Agent, Message } from "@agentxjs/types";
import { useSession, type SessionItem } from "~/hooks/useSession";
import { useAgent } from "~/hooks/useAgent";
import { DefinitionPane } from "~/components/container/DefinitionPane";
import { SessionPane } from "~/components/container/SessionPane";
import { AgentPane } from "~/components/container/AgentPane";
import { InputPane } from "~/components/container/InputPane";
import { Sidebar } from "~/components/layout/Sidebar";
import { MainContent } from "~/components/layout/MainContent";
import type { AgentDefinitionItem } from "~/components/container/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/Studio");

/**
 * Props for Studio component
 */
export interface StudioProps {
  /**
   * AgentX instance for backend communication
   */
  agentx: AgentX;

  /**
   * Current user ID
   */
  userId: string;

  /**
   * User's dedicated Container ID
   * All agent operations will use this container
   */
  containerId: string;

  /**
   * Available agent definitions
   */
  definitions: AgentDefinitionItem[];

  /**
   * Optional callback when session changes
   */
  onSessionChange?: (session: SessionItem | null) => void;

  /**
   * Optional callback when definition changes
   */
  onDefinitionChange?: (definition: AgentDefinitionItem | null) => void;

  /**
   * Optional custom className
   */
  className?: string;
}

/**
 * Studio - Integration layer component
 *
 * Integrates:
 * - useSession for session management (maps to agentx.sessions)
 * - useAgent for agent state (maps to agentx.agents)
 * - ContainerView layout components
 */
export function Studio({
  agentx,
  userId,
  containerId,
  definitions,
  onSessionChange,
  onDefinitionChange,
  className = "",
}: StudioProps) {
  // ===== UI Selection State =====
  const [currentDefinition, setCurrentDefinition] = useState<AgentDefinitionItem | null>(
    definitions[0] ?? null
  );

  // ===== Session State (maps to agentx.sessions) =====
  const {
    sessions,
    currentSession,
    selectSession,
    createSession,
    deleteSession,
    isLoading: sessionLoading,
  } = useSession(agentx, userId, {
    onSessionChange: (session) => {
      onSessionChange?.(session);
    },
  });

  // ===== Agent Instance Management =====
  // Agent lifecycle is EXPLICITLY managed by handlers, NOT by useEffect watching state.
  // This avoids race conditions between create and resume.
  const [agent, setAgent] = useState<Agent | null>(null);
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);

  // Cleanup agent on unmount only
  useEffect(() => {
    return () => {
      if (agent) {
        logger.debug("Cleaning up agent on unmount", { agentId: agent.agentId });
        agent.destroy?.().catch((err) => logger.error("Failed to destroy agent", { error: err }));
      }
    };
  }, [agent]);

  // ===== Agent State (maps to agentx.agents) =====
  const {
    messages: liveMessages,
    streaming,
    errors,
    send,
    status,
    interrupt,
    isLoading: agentLoading,
  } = useAgent(agent);

  // Combine history messages with live messages
  // History is loaded once on session change, live messages accumulate during conversation
  const messages = [...historyMessages, ...liveMessages];

  // ===== Handlers =====
  // All agent lifecycle operations are EXPLICIT - no auto-resume via useEffect.

  /**
   * Helper: Destroy current agent if exists
   */
  const destroyCurrentAgent = useCallback(async () => {
    if (agent) {
      logger.debug("Destroying current agent", { agentId: agent.agentId });
      await agent.destroy?.();
      setAgent(null);
      setHistoryMessages([]);
    }
  }, [agent]);

  /**
   * Select a different definition - clears current session and agent
   */
  const handleSelectDefinition = useCallback(
    async (definition: AgentDefinitionItem) => {
      logger.debug("Selecting definition", { name: definition.name });

      // Clear agent first
      await destroyCurrentAgent();

      setCurrentDefinition(definition);
      onDefinitionChange?.(definition);
      selectSession(null);
    },
    [destroyCurrentAgent, selectSession, onDefinitionChange]
  );

  /**
   * Select an existing session - EXPLICITLY resumes agent
   * This is the only place where resume() is called.
   */
  const handleSelectSession = useCallback(
    async (session: SessionItem) => {
      logger.info("Selecting existing session", { sessionId: session.sessionId });

      // Destroy current agent before resuming new one
      await destroyCurrentAgent();

      try {
        // Get the actual Session object
        const sessionObj = await agentx.sessions.get(session.sessionId);
        if (!sessionObj) {
          logger.error("Session not found", { sessionId: session.sessionId });
          return;
        }

        // Load history messages
        const history = await sessionObj.getMessages();
        setHistoryMessages(history);

        // Resume agent (this is the ONLY place we call resume)
        const resumedAgent = await sessionObj.resume({ containerId });
        setAgent(resumedAgent);

        // Select session AFTER agent is ready
        selectSession(session);

        logger.info("Session selected and agent resumed", {
          sessionId: session.sessionId,
          agentId: resumedAgent.agentId,
        });
      } catch (error) {
        logger.error("Failed to select session", { sessionId: session.sessionId, error });
      }
    },
    [agentx, containerId, destroyCurrentAgent, selectSession]
  );

  /**
   * Create a new session - EXPLICITLY runs agent
   * This is the only place where run() is called.
   *
   * @param initialMessage - Optional message to send after session is ready.
   *                         Using flushSync ensures useAgent subscribes before sending.
   */
  const handleCreateSession = useCallback(
    async (initialMessage?: string): Promise<Agent | null> => {
      if (!currentDefinition) return null;

      logger.info("Creating new session", { definition: currentDefinition.name });

      // Destroy current agent before creating new one
      await destroyCurrentAgent();

      try {
        // Get MetaImage for the current definition
        const metaImage = await agentx.images.getMetaImage(currentDefinition.name);
        if (!metaImage) {
          logger.error("MetaImage not found", { definition: currentDefinition.name });
          return null;
        }

        // Create session (does NOT auto-select)
        const newSession = await createSession(
          metaImage.imageId,
          `New Chat ${sessions.length + 1}`
        );

        // Run agent (this is the ONLY place we call run)
        const newAgent = await agentx.images.run(metaImage.imageId, { containerId });

        // Collect messages from agent to session
        const sessionObj = await agentx.sessions.get(newSession.sessionId);
        if (sessionObj) {
          sessionObj.collect(newAgent);
        }

        // Use flushSync to force React to update synchronously
        // This ensures useAgent hook subscribes to newAgent BEFORE we send any message
        flushSync(() => {
          setHistoryMessages([]); // New session has no history
          setAgent(newAgent);
        });

        // Select session AFTER agent is ready
        selectSession(newSession);

        logger.info("Session created and agent started", {
          sessionId: newSession.sessionId,
          agentId: newAgent.agentId,
        });

        // If there's an initial message, send it now (useAgent is already subscribed)
        if (initialMessage) {
          newAgent.receive(initialMessage);
        }

        return newAgent;
      } catch (error) {
        logger.error("Failed to create session", { error });
        return null;
      }
    },
    [
      agentx,
      currentDefinition,
      containerId,
      createSession,
      sessions.length,
      destroyCurrentAgent,
      selectSession,
    ]
  );

  /**
   * Delete a session - also clears agent if it's the current session
   */
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      // If deleting current session, destroy agent first
      if (currentSession?.sessionId === sessionId) {
        await destroyCurrentAgent();
      }
      await deleteSession(sessionId);
    },
    [currentSession?.sessionId, destroyCurrentAgent, deleteSession]
  );

  /**
   * Send a message - auto-creates session if needed
   */
  const handleSend = useCallback(
    async (text: string) => {
      if (!currentSession) {
        // Auto-create session with initial message
        // handleCreateSession uses flushSync to ensure useAgent subscribes before sending
        await handleCreateSession(text);
      } else {
        send(text);
      }
    },
    [currentSession, handleCreateSession, send]
  );

  // ===== Computed State =====
  const isLoading = sessionLoading || agentLoading;

  // ===== Render =====
  return (
    <div className={`h-full bg-background ${className}`}>
      <Allotment>
        {/* ActivityBar - Definition selection */}
        <Allotment.Pane minSize={56} maxSize={56}>
          <div className="h-full bg-muted/30 border-r border-border">
            <DefinitionPane
              definitions={definitions}
              current={currentDefinition}
              onSelect={handleSelectDefinition}
              onSettings={() => {
                // TODO: Settings dialog
                console.log("Open settings");
              }}
            />
          </div>
        </Allotment.Pane>

        {/* Sidebar - Session list */}
        <Allotment.Pane minSize={200} maxSize={400} preferredSize={280}>
          <Sidebar>
            <SessionPane
              sessions={sessions}
              current={currentSession}
              agentName={currentDefinition?.name}
              onSelect={handleSelectSession}
              onCreate={handleCreateSession}
              onDelete={handleDeleteSession}
            />
          </Sidebar>
        </Allotment.Pane>

        {/* MainContent - Chat area */}
        <Allotment.Pane>
          <MainContent>
            <Allotment vertical>
              <Allotment.Pane>
                <AgentPane
                  definition={currentDefinition}
                  session={currentSession}
                  agentId={agent?.agentId}
                  messages={messages}
                  streaming={streaming}
                  errors={errors}
                  status={status}
                  isLoading={isLoading}
                  onAbort={interrupt}
                  onCreateSession={handleCreateSession}
                />
              </Allotment.Pane>

              <Allotment.Pane minSize={150} maxSize={600} preferredSize={220}>
                <InputPane
                  key={currentSession?.sessionId ?? "new"}
                  onSend={handleSend}
                  disabled={isLoading}
                />
              </Allotment.Pane>
            </Allotment>
          </MainContent>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default Studio;
