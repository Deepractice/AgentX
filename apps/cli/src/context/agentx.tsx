/**
 * AgentX Provider - Connect to AgentX server
 */

import {
  createContext,
  useContext,
  onMount,
  onCleanup,
  createSignal,
  type ParentProps,
} from "solid-js";
import { createAgentX, type AgentX } from "agentxjs";

interface AgentXContext {
  client: AgentX | null;
  connected: () => boolean;
  error: () => string | null;
  reconnect: () => Promise<void>;
}

const AgentXCtx = createContext<AgentXContext>();

export function AgentXProvider(props: ParentProps<{ serverUrl: string }>) {
  const [client, setClient] = createSignal<AgentX | null>(null);
  const [connected, setConnected] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function connect() {
    try {
      setError(null);
      const agentx = await createAgentX({
        serverUrl: props.serverUrl,
        autoReconnect: true,
      });
      setClient(agentx);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setConnected(false);
    }
  }

  onMount(() => {
    connect();
  });

  onCleanup(() => {
    client()?.dispose();
  });

  const ctx: AgentXContext = {
    get client() {
      return client();
    },
    connected,
    error,
    reconnect: connect,
  };

  return <AgentXCtx.Provider value={ctx}>{props.children}</AgentXCtx.Provider>;
}

export function useAgentX(): AgentXContext {
  const ctx = useContext(AgentXCtx);
  if (!ctx) {
    throw new Error("useAgentX must be used within AgentXProvider");
  }
  return ctx;
}
