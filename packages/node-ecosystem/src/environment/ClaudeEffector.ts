/**
 * ClaudeEffector - Listens to SystemBus and sends to Claude SDK
 *
 * Subscribes to user_message events on SystemBus and sends to Claude SDK.
 */

import type { Effector, SystemBus, UserMessage } from "@agentxjs/types";
import {
  query,
  type SDKUserMessage,
  type Query,
} from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";
import { buildOptions, type EnvironmentContext } from "./buildOptions";
import { buildSDKUserMessage } from "./helpers";
import { observableToAsyncIterable } from "./observableToAsyncIterable";
import type { ClaudeReceptor } from "./ClaudeReceptor";

const logger = createLogger("ecosystem/ClaudeEffector");

/**
 * ClaudeEffector configuration
 */
export interface ClaudeEffectorConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  sessionId?: string;
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
}

/**
 * ClaudeEffector - Subscribes to SystemBus and sends to Claude SDK
 */
export class ClaudeEffector implements Effector {
  private readonly config: ClaudeEffectorConfig;
  private readonly receptor: ClaudeReceptor;

  private promptSubject = new Subject<SDKUserMessage>();
  private currentAbortController: AbortController | null = null;
  private claudeQuery: Query | null = null;
  private isInitialized = false;
  private wasInterrupted = false;

  constructor(config: ClaudeEffectorConfig, receptor: ClaudeReceptor) {
    this.config = config;
    this.receptor = receptor;
  }

  /**
   * Subscribe to SystemBus
   */
  subscribe(bus: SystemBus): void {
    logger.debug("ClaudeEffector subscribing to SystemBus");

    // Listen for user_message events
    bus.on("user_message", async (event) => {
      const message = (event as { type: string; data: UserMessage }).data;
      await this.send(message);
    });

    // Listen for interrupt events
    bus.on("interrupt", () => {
      this.interrupt();
    });
  }

  /**
   * Send a message to Claude SDK
   */
  private async send(message: UserMessage): Promise<void> {
    this.wasInterrupted = false;
    this.currentAbortController = new AbortController();

    try {
      await this.initialize(this.currentAbortController);

      const sessionId = this.config.sessionId || "default";
      const sdkUserMessage = buildSDKUserMessage(message, sessionId);

      logger.debug("Sending message to Claude", {
        content:
          typeof message.content === "string"
            ? message.content.substring(0, 80)
            : "[structured]",
      });

      this.promptSubject.next(sdkUserMessage);

      // Process SDK responses
      await this.processResponses();
    } finally {
      this.currentAbortController = null;
      this.wasInterrupted = false;
    }
  }

  /**
   * Interrupt current operation
   */
  private interrupt(): void {
    if (this.claudeQuery) {
      logger.debug("Interrupting Claude query");
      this.wasInterrupted = true;
      this.claudeQuery.interrupt().catch((err) => {
        logger.debug("SDK interrupt() error (may be expected)", { error: err });
      });
    }
  }

  /**
   * Initialize the Claude SDK query (lazy initialization)
   */
  private async initialize(abortController: AbortController): Promise<void> {
    if (this.isInitialized) return;

    logger.info("Initializing ClaudeEffector");

    const context: EnvironmentContext = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      systemPrompt: this.config.systemPrompt,
      cwd: this.config.cwd,
      resume: this.config.resumeSessionId,
    };

    const sdkOptions = buildOptions(context, abortController);
    const promptStream = observableToAsyncIterable<SDKUserMessage>(this.promptSubject);

    this.claudeQuery = query({
      prompt: promptStream,
      options: sdkOptions,
    });

    this.isInitialized = true;

    // Background listener for SDK responses
    this.startBackgroundListener();

    logger.info("ClaudeEffector initialized");
  }

  /**
   * Start background listener for SDK responses
   */
  private startBackgroundListener(): void {
    (async () => {
      try {
        for await (const sdkMsg of this.claudeQuery!) {
          // Forward to receptor for emission
          if (sdkMsg.type === "stream_event") {
            this.receptor.feed(sdkMsg);
          }

          // Capture session ID
          if (sdkMsg.session_id && this.config.onSessionIdCaptured) {
            this.config.onSessionIdCaptured(sdkMsg.session_id);
          }

          // Handle result
          if (sdkMsg.type === "result") {
            if (sdkMsg.subtype === "error_during_execution" && this.wasInterrupted) {
              this.receptor.emitInterrupted("user_interrupt");
            }
          }
        }
      } catch (error) {
        if (this.isAbortError(error)) {
          logger.debug("Background listener aborted (expected during interrupt)");
          this.resetState();
        } else {
          logger.error("Background listener error", { error });
        }
      }
    })();
  }

  /**
   * Process SDK responses (wait for result)
   */
  private async processResponses(): Promise<void> {
    // Wait for the background listener to process responses
    // The receptor will emit events to SystemBus
  }

  /**
   * Check if an error is an abort error
   */
  private isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
      if (error.name === "AbortError") return true;
      if (error.message.includes("aborted")) return true;
      if (error.message.includes("abort")) return true;
    }
    return false;
  }

  /**
   * Reset state after abort
   */
  private resetState(): void {
    this.isInitialized = false;
    this.claudeQuery = null;
    this.promptSubject = new Subject<SDKUserMessage>();
  }
}
