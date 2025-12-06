/**
 * useAgentX - React hook for AgentX instance management
 *
 * Creates and manages an AgentX instance lifecycle.
 *
 * @example
 * ```tsx
 * import { useAgentX } from "@agentxjs/ui";
 *
 * function App() {
 *   // Remote mode - connect to server
 *   const agentx = useAgentX({ server: "ws://localhost:5200" });
 *
 *   // Local mode with API key
 *   // const agentx = useAgentX({ llm: { apiKey: "sk-..." } });
 *
 *   if (!agentx) return <div>Connecting...</div>;
 *
 *   return <Chat agentx={agentx} />;
 * }
 * ```
 */

import { useState, useEffect } from "react";
import type { AgentX, AgentXConfig } from "agentxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/useAgentX");

// Lazy import to avoid bundling issues
let createAgentXFn: ((config?: AgentXConfig) => Promise<AgentX>) | null = null;

async function getCreateAgentX(): Promise<
  (config?: AgentXConfig) => Promise<AgentX>
> {
  if (!createAgentXFn) {
    const module = await import("agentxjs");
    createAgentXFn = module.createAgentX;
  }
  return createAgentXFn;
}

/**
 * React hook for AgentX instance management
 *
 * Creates an AgentX instance on mount and disposes on unmount.
 *
 * @param config - AgentX configuration (LocalConfig or RemoteConfig)
 * @returns The AgentX instance (null during initialization)
 */
export function useAgentX(config?: AgentXConfig): AgentX | null {
  const [agentx, setAgentx] = useState<AgentX | null>(null);

  // Serialize config for dependency comparison
  const configKey = JSON.stringify(config ?? {});

  useEffect(() => {
    let instance: AgentX | null = null;
    let mounted = true;

    getCreateAgentX()
      .then(async (createAgentX) => {
        if (!mounted) return;
        instance = await createAgentX(config);
        if (mounted) {
          setAgentx(instance);
        }
      })
      .catch((error) => {
        logger.error("Failed to initialize AgentX", { error });
      });

    return () => {
      mounted = false;
      if (instance) {
        instance.dispose().catch((error) => {
          logger.error("Failed to dispose AgentX", { error });
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  return agentx;
}
