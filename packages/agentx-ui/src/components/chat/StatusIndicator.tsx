/**
 * StatusIndicator - Pure UI component for displaying agent status
 *
 * Shows loading state with animations, elapsed time, and abort button.
 * This is a presentational component - it receives status via props.
 *
 * @example
 * ```tsx
 * <StatusIndicator
 *   status="responding"
 *   isLoading={true}
 *   onAbort={() => agent.interrupt()}
 * />
 * ```
 */

import { useState, useEffect } from "react";
import type { AgentState } from "@deepractice-ai/agentx-types";

export interface StatusIndicatorProps {
  /**
   * Current agent state
   */
  status: AgentState;

  /**
   * Whether the agent is currently processing
   */
  isLoading: boolean;

  /**
   * Callback to abort/interrupt the current operation
   */
  onAbort?: () => void;

  /**
   * Whether to show the abort button
   * @default true
   */
  showAbortButton?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Get display text for agent state
 */
function getStatusText(state: AgentState): string {
  switch (state) {
    case "initializing":
      return "Initializing";
    case "queued":
      return "Queued";
    case "thinking":
      return "Thinking";
    case "responding":
      return "Responding";
    case "planning_tool":
      return "Planning tool use";
    case "awaiting_tool_result":
      return "Awaiting tool result";
    case "conversation_active":
      return "Processing";
    default:
      return "";
  }
}

/**
 * StatusIndicator - Displays status with animations
 */
export function StatusIndicator({
  status,
  isLoading,
  onAbort,
  showAbortButton = true,
  className = "",
}: StatusIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Elapsed time counter
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(timer);
  }, [isLoading]);

  const statusText = getStatusText(status);
  const spinners = ["●", "●", "●", "○"];

  if (!isLoading) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto bg-gray-900 dark:bg-gray-950 text-white rounded-lg shadow-lg px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Animated spinner */}
            <span className="text-xl text-blue-400 flex items-center space-x-0.5">
              {spinners.map((dot, i) => (
                <span
                  key={i}
                  className={`transition-opacity duration-200 ${
                    i === animationPhase ? "opacity-100" : "opacity-30"
                  }`}
                >
                  {dot}
                </span>
              ))}
            </span>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{statusText}...</span>
                <span className="text-gray-400 text-sm">({elapsedTime}s)</span>
                <span className="text-gray-400 hidden sm:inline">·</span>
                <span className="text-gray-300 text-sm hidden sm:inline">esc to interrupt</span>
              </div>
              <div className="text-xs text-gray-400 sm:hidden mt-1">esc to interrupt</div>
            </div>
          </div>
        </div>

        {showAbortButton && onAbort && (
          <button
            onClick={onAbort}
            className="ml-3 text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}
