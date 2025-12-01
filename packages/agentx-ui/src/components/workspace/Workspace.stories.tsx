/**
 * Workspace Stories
 *
 * Demonstrates the full Workspace component with business logic.
 *
 * Two modes:
 * 1. FullWorkspace - Complete integration with all panes and hooks
 * 2. LiveWorkspace - Simplified demo for isomorphic architecture testing
 *
 * Prerequisites:
 * - Run `pnpm dev:server` first
 * - Server should be running at http://localhost:5200
 */

import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import type { Agent, AgentX } from "@deepractice-ai/agentx-types";

// Isomorphic imports - same API for browser and Node.js
import { createAgentX } from "@deepractice-ai/agentx";
import { createSSERuntime } from "@deepractice-ai/agentx/client";

// Components
import { Workspace } from "./Workspace";
import { AgentPane } from "~/components/container/AgentPane";
import { InputPane } from "~/components/container/InputPane";
import { MainContent } from "~/components/layout/MainContent";

// Hooks
import { useAgent } from "~/hooks/useAgent";

import type { AgentDefinitionItem, SessionItem } from "~/components/container/types";

const meta: Meta = {
  title: "Workspace/Workspace",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
**Workspace - Full Integration Layer**

The Workspace component integrates:
- useSession hook (maps to agentx.sessions)
- useAgent hook (maps to agentx.agents)
- All UI panes (DefinitionPane, SessionPane, AgentPane, InputPane)

**Prerequisites:**
1. Start dev-server: \`pnpm dev:server\`
2. Server should be at http://localhost:5200
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SERVER_URL = "http://localhost:5200/agentx";

// Agent definitions
const definitions: AgentDefinitionItem[] = [
  {
    name: "ClaudeAgent",
    description: "Claude AI Assistant",
    icon: "C",
    color: "bg-blue-500",
    isOnline: true,
  },
  {
    name: "GPT4",
    description: "GPT-4 Assistant",
    icon: "G",
    color: "bg-green-500",
    isOnline: false,
  },
];

/**
 * Connection status component
 */
function ConnectionStatus({
  isConnected,
  agentId,
}: {
  isConnected: boolean;
  agentId: string | null;
}) {
  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-background border border-border rounded-full px-3 py-1 shadow-lg z-50">
      <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
      <span className="text-xs text-muted-foreground">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
      {agentId && (
        <span className="text-xs text-muted-foreground border-l border-border pl-2">
          Agent: {agentId.slice(0, 8)}...
        </span>
      )}
    </div>
  );
}

/**
 * Error display component
 */
function ConnectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <h2 className="text-xl font-semibold text-foreground mb-2">Server Not Connected</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <div className="bg-muted p-4 rounded-lg text-left mb-4">
          <p className="text-sm font-mono text-foreground">
            # Start the dev server first:
            <br />
            pnpm dev:server
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );
}

/**
 * Loading component
 */
function LoadingScreen() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">...</div>
        <p className="text-muted-foreground">Connecting to server...</p>
      </div>
    </div>
  );
}

// ===== Full Workspace Story =====

/**
 * FullWorkspaceComponent - Uses the Workspace component with full business logic
 */
function FullWorkspaceComponent() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [agentx, setAgentx] = useState<AgentX | null>(null);

  // Connect to server and create AgentX instance
  useEffect(() => {
    let mounted = true;

    const initConnection = async () => {
      try {
        // 1. Check server is reachable
        const response = await fetch(`${SERVER_URL}/info`);
        if (!response.ok) {
          throw new Error("Server returned error");
        }

        if (!mounted) return;
        setIsConnected(true);
        setConnectionError(null);

        // 2. Create SSERuntime (without agentId - Workspace will create agents as needed)
        const runtime = createSSERuntime({
          serverUrl: SERVER_URL,
        });
        const agentxInstance = createAgentX(runtime);

        if (!mounted) return;
        setAgentx(agentxInstance);
      } catch (error) {
        if (!mounted) return;
        console.error("Connection error:", error);
        setConnectionError("Cannot connect to server. Run: pnpm dev:server");
        setIsConnected(false);
      }
    };

    initConnection();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  if (connectionError) {
    return <ConnectionError message={connectionError} onRetry={handleRetry} />;
  }

  if (!isConnected || !agentx) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen bg-background">
      <Workspace
        agentx={agentx}
        userId="user_storybook"
        definitions={definitions}
        onSessionChange={(session) => console.log("Session changed:", session?.sessionId)}
        onDefinitionChange={(def) => console.log("Definition changed:", def?.name)}
      />
      <ConnectionStatus isConnected={isConnected} agentId={null} />
    </div>
  );
}

/**
 * Full Workspace - Complete Integration
 *
 * Uses the Workspace component with all business logic:
 * - DefinitionPane (left)
 * - SessionPane (middle)
 * - AgentPane + InputPane (right)
 */
export const FullWorkspace: Story = {
  render: () => <FullWorkspaceComponent />,
};

// ===== Live Workspace Story (Simplified) =====

/**
 * LiveWorkspaceComponent - Simplified demo for isomorphic architecture
 */
function LiveWorkspaceComponent() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);

  const [session] = useState<SessionItem>({
    sessionId: "session_live",
    userId: "user_storybook",
    imageId: "image_claude",
    title: "Live Chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Isomorphic hook - works with any Agent!
  const { messages, streaming, send, isLoading, errors } = useAgent(agent);

  useEffect(() => {
    let mounted = true;
    let createdAgent: Agent | null = null;

    const initConnection = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/info`);
        if (!response.ok) {
          throw new Error("Server returned error");
        }

        if (!mounted) return;
        setIsConnected(true);
        setConnectionError(null);

        // Create agent on server
        const createResponse = await fetch(`${SERVER_URL}/agents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ definition: "ClaudeAgent" }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create agent on server");
        }

        const { agentId } = await createResponse.json();

        // Create SSERuntime connected to this agent
        const runtime = createSSERuntime({
          serverUrl: SERVER_URL,
          agentId,
        });
        const agentx = createAgentX(runtime);

        // Create browser-side agent
        createdAgent = agentx.agents.create(definitions[0]);

        if (!mounted) {
          createdAgent.destroy?.();
          return;
        }

        setAgent(createdAgent);
      } catch (error) {
        if (!mounted) return;
        console.error("Connection error:", error);
        setConnectionError("Cannot connect to server. Run: pnpm dev:server");
        setIsConnected(false);
      }
    };

    initConnection();

    return () => {
      mounted = false;
      createdAgent?.destroy?.();
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleSend = (text: string) => {
    if (!agent) {
      console.error("No agent available");
      return;
    }
    send(text);
  };

  if (connectionError) {
    return <ConnectionError message={connectionError} onRetry={handleRetry} />;
  }

  if (!isConnected || !agent) {
    return <LoadingScreen />;
  }

  return (
    <div className="h-screen bg-background">
      <MainContent>
        <Allotment vertical>
          <Allotment.Pane>
            <AgentPane
              definition={definitions[0]}
              session={session}
              messages={messages}
              streaming={streaming}
              errors={errors}
              isLoading={isLoading}
            />
          </Allotment.Pane>

          <Allotment.Pane minSize={80} maxSize={400} preferredSize={120}>
            <InputPane onSend={handleSend} disabled={isLoading} />
          </Allotment.Pane>
        </Allotment>
      </MainContent>

      <ConnectionStatus isConnected={isConnected} agentId={agent?.agentId ?? null} />
    </div>
  );
}

/**
 * Live Workspace - Isomorphic Architecture Demo
 *
 * Simplified version showing just AgentPane + InputPane.
 * Demonstrates the isomorphic design where browser uses same Agent API as Node.js.
 */
export const LiveWorkspace: Story = {
  render: () => <LiveWorkspaceComponent />,
};
