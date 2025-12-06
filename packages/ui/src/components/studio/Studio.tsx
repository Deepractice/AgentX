/**
 * Studio - Integration layer for AI chat UI
 *
 * New architecture:
 * - Agent instance = one conversation (short-lived)
 * - Image = saved conversation snapshot (persistent)
 *
 * Studio provides a ready-to-use chat interface that:
 * - Manages AgentX connection
 * - Displays saved conversations (Images)
 * - Handles conversation state
 *
 * @example
 * ```tsx
 * import { Studio } from "@agentxjs/ui";
 *
 * function App() {
 *   return (
 *     <Studio
 *       serverUrl="ws://localhost:5200"
 *       containerId="my-container"
 *     />
 *   );
 * }
 * ```
 */

import React from "react";
import type { AgentX, AgentXConfig } from "agentxjs";
import { useAgentX } from "~/hooks/useAgentX";
import { ContainerView } from "~/components/container/ContainerView";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/Studio");

/**
 * Props for Studio component
 */
export interface StudioProps {
  /**
   * AgentX configuration or instance
   * If config, Studio will create and manage the AgentX instance
   * If instance, Studio will use the provided instance
   */
  agentx?: AgentX | AgentXConfig;

  /**
   * Container ID for organizing conversations
   */
  containerId: string;

  /**
   * Default agent configuration for new conversations
   */
  defaultAgentConfig?: {
    name: string;
    systemPrompt?: string;
  };

  /**
   * Optional custom className
   */
  className?: string;
}

/**
 * Studio - Ready-to-use chat interface
 */
export function Studio({
  agentx: agentxProp,
  containerId,
  defaultAgentConfig = { name: "Assistant", systemPrompt: "You are a helpful assistant." },
  className = "",
}: StudioProps) {
  // Determine if we need to create AgentX or use provided instance
  const isAgentXInstance = agentxProp && typeof (agentxProp as AgentX).request === "function";
  const config = isAgentXInstance ? undefined : (agentxProp as AgentXConfig | undefined);

  // Create AgentX instance if config provided
  const createdAgentx = useAgentX(config);
  const agentx = isAgentXInstance ? (agentxProp as AgentX) : createdAgentx;

  // Ensure container exists
  React.useEffect(() => {
    if (!agentx) return;

    // Create container if it doesn't exist
    agentx.request("container_create_request", { containerId }).catch((error) => {
      // Container might already exist, which is fine
      logger.debug("Container create result", { containerId, error });
    });
  }, [agentx, containerId]);

  // Loading state
  if (!agentx) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="text-gray-500 dark:text-gray-400">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <ContainerView
      agentx={agentx}
      containerId={containerId}
      defaultAgentConfig={defaultAgentConfig}
      className={className}
    />
  );
}

export default Studio;
