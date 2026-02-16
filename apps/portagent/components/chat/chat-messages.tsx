"use client";

import { AlertCircleIcon, CheckCircleIcon, LoaderIcon, WrenchIcon } from "lucide-react";
import * as React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message, ToolInfo } from "./types";

interface ChatMessagesProps {
  messages: Message[];
  isThinking?: boolean;
}

export function ChatMessages({ messages, isThinking }: ChatMessagesProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (messages.length === 0) {
    return (
      <div data-testid="conversation-area" className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Start a new conversation</p>
      </div>
    );
  }

  return (
    <ScrollArea data-testid="conversation-area" className="flex-1 overflow-hidden">
      <div className="mx-auto max-w-3xl flex flex-col gap-6 px-4 py-6">
        {messages.map((msg) =>
          msg.tool ? (
            <ToolCallBlock key={msg.id} tool={msg.tool} />
          ) : msg.from === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5">
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id}>
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>
            </div>
          )
        )}
        {isThinking && (
          <div>
            <div className="flex items-center gap-1.5 py-2">
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-2 rounded-full bg-foreground/40 animate-bounce" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function ToolStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
    case "pending":
      return <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />;
    case "completed":
      return <CheckCircleIcon className="size-3.5 text-green-600" />;
    case "error":
      return <AlertCircleIcon className="size-3.5 text-destructive" />;
    default:
      return <WrenchIcon className="size-3.5 text-muted-foreground" />;
  }
}

function getToolSummary(tool: ToolInfo): string {
  const input = tool.toolInput;
  if (input.command) return String(input.command);
  if (input.code) return String(input.code);
  if (input.query) return String(input.query);
  if (input.url) return String(input.url);
  if (input.path) return String(input.path);
  const keys = Object.keys(input);
  if (keys.length === 0) return "";
  const firstVal = input[keys[0]];
  if (typeof firstVal === "string") return firstVal;
  return JSON.stringify(firstVal);
}

function ToolCallBlock({ tool }: { tool: ToolInfo }) {
  const [expanded, setExpanded] = React.useState(false);
  const summary = getToolSummary(tool);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <ToolStatusIcon status={tool.status} />
        <span className="font-medium text-foreground shrink-0">{tool.toolName}</span>
        {summary && <span className="truncate font-mono text-muted-foreground">{summary}</span>}
        <span className="ml-auto shrink-0">{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="mt-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
          {Object.keys(tool.toolInput).length > 0 && (
            <div className="mb-2">
              <p className="font-medium text-muted-foreground mb-1">Input</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-foreground">
                {JSON.stringify(tool.toolInput, null, 2)}
              </pre>
            </div>
          )}
          {tool.toolResult != null && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Result</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-foreground max-h-48 overflow-y-auto">
                {typeof tool.toolResult === "string"
                  ? tool.toolResult
                  : (JSON.stringify(tool.toolResult, null, 2) ?? "")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
