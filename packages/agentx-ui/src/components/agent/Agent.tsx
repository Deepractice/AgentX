/**
 * Agent - Integration component for Agent event binding
 *
 * Binds to an Agent instance and provides state to children via render props.
 * Handles event subscription and state management internally.
 *
 * Responsibilities:
 * - Receive Agent instance (user manages creation/lifecycle)
 * - Bind events via useAgent hook
 * - Pass state to children via render props
 *
 * Does NOT:
 * - Create Agent instances
 * - Manage serverUrl/agentId configuration
 * - Handle Agent lifecycle (user controls this)
 *
 * @example
 * ```tsx
 * import { Agent, Chat } from "@deepractice-ai/agentx-ui";
 * import { createRemoteAgent } from "@deepractice-ai/agentx/client";
 *
 * // User manages Agent creation
 * const agent = createRemoteAgent({ serverUrl, agentId });
 *
 * // Agent component handles event binding, Chat is pure UI
 * <Agent agent={agent}>
 *   {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
 *     <Chat
 *       messages={messages}
 *       streaming={streaming}
 *       errors={errors}
 *       status={status}
 *       isLoading={isLoading}
 *       onSend={send}
 *       onAbort={interrupt}
 *     />
 *   )}
 * </Agent>
 * ```
 */

import type { ReactNode } from "react";
import type { Agent as AgentType } from "@deepractice-ai/agentx-types";
import { useAgent, type UseAgentResult } from "../../hooks/useAgent";

export interface AgentProps {
  /**
   * Agent instance to bind to.
   * User is responsible for creating and managing the Agent lifecycle.
   */
  agent: AgentType;

  /**
   * Render function that receives agent state.
   * Use this to render your UI components with the bound state.
   */
  children: (state: UseAgentResult) => ReactNode;

  /**
   * Custom className for the container
   */
  className?: string;
}

/**
 * Agent - Integration component that binds Agent events to React state
 */
export function Agent({ agent, children, className = "" }: AgentProps) {
  const state = useAgent(agent);

  return <div className={`h-full flex flex-col ${className}`}>{children(state)}</div>;
}
