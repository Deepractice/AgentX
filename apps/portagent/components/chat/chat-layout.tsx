"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { PresentationStateLocal } from "@/hooks/use-agentx";
import { useAgentX } from "@/hooks/use-agentx";
import { ChatInput } from "./chat-input";
import { ChatMessages } from "./chat-messages";
import { ChatSidebar } from "./chat-sidebar";
import { ChatStatusBar } from "./chat-status-bar";
import type { Message, Session, User } from "./types";

interface ChatLayoutProps {
  user: User;
}

/**
 * Convert agentxjs PresentationState to the existing Message[] format
 * for compatibility with ChatMessages component.
 */
interface ToolBlockLike {
  type: "tool";
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: string;
  status: string;
}

function blocksToMessages(
  blocks: Array<{ type: string; [key: string]: any }>,
  idPrefix: string
): Message[] {
  const messages: Message[] = [];
  let idx = 0;
  // Accumulate consecutive text blocks
  let textAcc = "";

  const flushText = () => {
    if (textAcc) {
      messages.push({ id: `${idPrefix}-${idx++}`, from: "assistant", content: textAcc });
      textAcc = "";
    }
  };

  for (const b of blocks) {
    if (b.type === "text") {
      textAcc += (b as { type: "text"; content: string }).content;
    } else if (b.type === "tool") {
      flushText();
      const tb = b as unknown as ToolBlockLike;
      messages.push({
        id: `${idPrefix}-${idx++}`,
        from: "assistant",
        content: "",
        tool: {
          toolName: tb.toolName,
          toolInput: tb.toolInput,
          toolResult: tb.toolResult,
          status: tb.status,
        },
      });
    }
  }
  flushText();
  return messages;
}

function presentationToMessages(state: PresentationStateLocal): Message[] {
  const messages: Message[] = [];
  let convIndex = 0;

  for (const conv of state.conversations) {
    if (conv.role === "user") {
      const text = (conv.blocks ?? [])
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; content: string }).content)
        .join("");
      messages.push({ id: `msg-${convIndex}`, from: "user", content: text });
    } else if (conv.role === "assistant") {
      messages.push(...blocksToMessages(conv.blocks ?? [], `msg-${convIndex}`));
    } else if (conv.role === "error") {
      messages.push({
        id: `msg-${convIndex}`,
        from: "assistant",
        content: `Error: ${conv.message}`,
      });
    }
    convIndex++;
  }

  // Add streaming content if present
  if (state.streaming) {
    messages.push(...blocksToMessages(state.streaming.blocks, "msg-streaming"));
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
    pinned: s.pinned,
    renamed: s.renamed,
  }));

  const activeSessionId = agentx.activeSession?.imageId ?? null;

  // Build messages from presentation state
  const messages = React.useMemo(
    () => presentationToMessages(agentx.presentationState),
    [agentx.presentationState]
  );

  const status = agentx.presentationState.status;
  const isBusy = status === "thinking" || status === "responding" || status === "executing";
  // Show thinking indicator when AI is working but hasn't started streaming text yet
  const isThinking =
    isBusy &&
    !agentx.presentationState.streaming?.blocks.some(
      (b) => b.type === "text" && (b as { type: "text"; content: string }).content
    );

  const handleNewChat = async () => {
    await agentx.createSession();
  };

  const handleSelectSession = (id: string) => {
    agentx.selectSession(id);
  };

  const handleDeleteSession = async (id: string) => {
    await agentx.deleteSession(id);
  };

  const handlePinSession = async (id: string) => {
    await agentx.pinSession(id);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    await agentx.renameSession(id, newTitle);
  };

  const handleSend = async (text: string) => {
    if (!agentx.activeSession) {
      // Auto-create session if none active
      const session = await agentx.createSession();
      if (!session) return;
      // Send directly through the returned session's presentation
      // (avoids stale closure where activeSession is still null)
      await session.presentation?.send(text);
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
        onDeleteSession={handleDeleteSession}
        onPinSession={handlePinSession}
        onRenameSession={handleRenameSession}
      />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="shrink-0 flex items-center gap-2 border-b px-4 py-2">
          <h1 className="text-lg font-semibold">Portagent</h1>
          {status !== "idle" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {status === "thinking" && "Thinking..."}
              {status === "responding" && "Responding..."}
              {status === "executing" && "Executing tool..."}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {!agentx.connected && (
              <span className="text-xs text-muted-foreground">Connecting...</span>
            )}
            {agentx.error && <span className="text-xs text-destructive">{agentx.error}</span>}
          </span>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ChatMessages messages={messages} isThinking={isThinking} />
          <ChatStatusBar state={agentx.presentationState} />
          <ChatInput onSend={handleSend} disabled={isBusy} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
