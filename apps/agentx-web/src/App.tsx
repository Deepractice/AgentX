import { useEffect, useState } from "react";
import { WebSocketBrowserAgent } from "@deepractice-ai/agentx-framework/browser";
import type { AgentService } from "@deepractice-ai/agentx-framework/browser";
import { Chat } from "@deepractice-ai/agentx-ui";
import "./App.css";

export default function App() {
  const [agent, setAgent] = useState<AgentService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create agent with WebSocket connection
    // In development, connect to localhost:5200
    // In production, use same host
    const isDev = import.meta.env.DEV;
    const wsUrl = isDev
      ? "ws://localhost:5200/ws"
      : `ws://${window.location.host}/ws`;

    // Create WebSocket browser agent
    const sessionId = `session-${Date.now()}`;

    const agentInstance = WebSocketBrowserAgent.create({
      url: wsUrl,
      sessionId,
    });

    // Initialize agent and connect
    agentInstance
      .initialize()
      .then(() => {
        console.log("✅ Agent connected");
        setAgent(agentInstance);
      })
      .catch((err) => {
        console.error("❌ Failed to initialize agent:", err);
        setError("Failed to connect to agent server");
      });

    // Cleanup on unmount
    return () => {
      if (agent) {
        agent.destroy();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Connection Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" />
          <p>Connecting to agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#667eea] to-[#764ba2]">
      {/* Header */}
      <div className="h-14 flex items-center justify-center px-4 bg-white/10 backdrop-blur-sm border-b border-white/20">
        <h1 className="font-semibold text-lg text-white">Deepractice Agent</h1>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl h-full bg-white rounded-xl shadow-2xl overflow-hidden">
          <Chat agent={agent} />
        </div>
      </div>
    </div>
  );
}
