"use client";

import * as React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "./chat-sidebar";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { useAgentX } from "@/hooks/use-agentx";
import type { PresentationStateLocal } from "@/hooks/use-agentx";
import type { Session, Message, User } from "./types";

interface ChatLayoutProps {
  user: User;
}

/**
 * Convert agentxjs PresentationState to the existing Message[] format
 * for compatibility with ChatMessages component.
 */
function presentationToMessages(state: PresentationStateLocal): Message[] {
  const messages: Message[] = [];
  let msgIndex = 0;

  for (const conv of state.conversations) {
    if (conv.role === "user") {
      const text = (conv.blocks ?? [])
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; content: string }).content)
        .join("");
      messages.push({
        id: `msg-${msgIndex++}`,
        from: "user",
        content: text,
      });
    } else if (conv.role === "assistant") {
      const text = (conv.blocks ?? [])
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; content: string }).content)
        .join("");
      if (text) {
        messages.push({
          id: `msg-${msgIndex++}`,
          from: "assistant",
          content: text,
        });
      }
    } else if (conv.role === "error") {
      messages.push({
        id: `msg-${msgIndex++}`,
        from: "assistant",
        content: `Error: ${conv.message}`,
      });
    }
  }

  // Add streaming content if present
  if (state.streaming) {
    const text = state.streaming.blocks
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; content: string }).content)
      .join("");
    if (text) {
      messages.push({
        id: "msg-streaming",
        from: "assistant",
        content: text,
      });
    }
  }

  return messages;
}

export function ChatLayout({ user }: ChatLayoutProps) {
  const agentx = useAgentX({ userId: user.id });

  // Convert AgentX sessions to UI sessions
  const uiSessions: Session[] = agentx.sessions.map((s) => ({
    id: s.imageId,
    title: s.title,
    messages: [],
  }));

  const activeSessionId = agentx.activeSession?.imageId ?? null;

  // Build messages from presentation state
  const messages = React.useMemo(
    () => presentationToMessages(agentx.presentationState),
    [agentx.presentationState]
  );

  const handleNewChat = async () => {
    await agentx.createSession();
  };

  const handleSelectSession = (id: string) => {
    agentx.selectSession(id);
  };

  const handleSend = async (text: string) => {
    if (!agentx.activeSession) {
      // Auto-create session if none active
      const imageId = await agentx.createSession();
      if (!imageId) return;
      // Wait a tick for state to update, then send
      setTimeout(() => {
        agentx.sendMessage(text);
      }, 0);
      return;
    }
    await agentx.sendMessage(text);
  };

  return (
    <SidebarProvider>
      <ChatSidebar
        user={user}
        sessions={uiSessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
      />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Portagent</h1>
          {!agentx.connected && (
            <span className="ml-auto text-xs text-muted-foreground">Connecting...</span>
          )}
          {agentx.error && <span className="ml-auto text-xs text-destructive">{agentx.error}</span>}
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatMessages messages={messages} />
          <ChatInput onSend={handleSend} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
