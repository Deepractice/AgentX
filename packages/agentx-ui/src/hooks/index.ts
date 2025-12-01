/**
 * React Hooks for AgentX integration
 *
 * Hooks follow UI-Backend API Consistency principle (see index.ts ADR #5):
 * - useSession maps to agentx.sessions
 * - useAgent maps to agentx.agents
 * - useAgentX provides AgentX context
 *
 * @example
 * ```tsx
 * import { useSession, useAgent, useAgentX } from "@deepractice-ai/agentx-ui";
 *
 * function ChatPage({ userId }) {
 *   const agentx = useAgentX();
 *
 *   // Session management (maps to agentx.sessions)
 *   const { sessions, currentSession, selectSession, createSession } = useSession(agentx, userId);
 *
 *   // Agent state (maps to agentx.agents)
 *   const { messages, streaming, send, isLoading } = useAgent(agent);
 *
 *   return <Chat messages={messages} streaming={streaming} onSend={send} />;
 * }
 * ```
 */

export { useAgent, type UseAgentResult, type UseAgentOptions } from "./useAgent";
export { useAgentX } from "./useAgentX";
export { useSession, type UseSessionResult, type UseSessionOptions } from "./useSession";
// Note: SessionItem is exported from ~/components/container to avoid duplicate exports
