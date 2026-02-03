/**
 * Devtools SDK - VCR-style fixture management
 *
 * Automatically uses existing fixtures or records new ones on-the-fly.
 *
 * Usage:
 * ```typescript
 * import { createDevtools } from "@agentxjs/devtools";
 *
 * const devtools = createDevtools({
 *   fixturesDir: "./fixtures",
 *   apiKey: process.env.DEEPRACTICE_API_KEY,
 * });
 *
 * // Has fixture → playback
 * // No fixture → call API, record, save, return
 * const driver = await devtools.driver("hello-test", {
 *   message: "Hello!",
 * });
 *
 * driver.connect(consumer, producer);
 * ```
 */

import type { Driver, DriverFactory } from "@agentxjs/core/driver";
import type { Fixture } from "./types";
import { MockDriver } from "./mock/MockDriver";
import { RecordingDriver } from "./recorder/RecordingDriver";
import { createLogger } from "commonxjs/logger";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const logger = createLogger("devtools/Devtools");

/**
 * Devtools configuration
 */
export interface DevtoolsConfig {
  /**
   * Directory to store/load fixtures
   */
  fixturesDir: string;

  /**
   * API key for recording (required if recording)
   */
  apiKey?: string;

  /**
   * API base URL
   */
  baseUrl?: string;

  /**
   * Default model
   */
  model?: string;

  /**
   * Default system prompt
   */
  systemPrompt?: string;

  /**
   * Working directory for tool execution
   */
  cwd?: string;

  /**
   * Real driver factory for recording
   * If not provided, will try to use @agentxjs/claude-driver
   */
  driverFactory?: DriverFactory;
}

/**
 * Options for getting a driver
 */
export interface DriverOptions {
  /**
   * Message to send if recording is needed
   */
  message: string;

  /**
   * Override system prompt
   */
  systemPrompt?: string;

  /**
   * Override working directory
   */
  cwd?: string;

  /**
   * Force re-record even if fixture exists
   */
  forceRecord?: boolean;
}

/**
 * Devtools SDK
 */
export class Devtools {
  private config: DevtoolsConfig;
  private realDriverFactory: DriverFactory | null = null;

  constructor(config: DevtoolsConfig) {
    this.config = config;
    logger.info("Devtools initialized", { fixturesDir: config.fixturesDir });
  }

  /**
   * Get a driver for the given fixture name
   *
   * - If fixture exists → returns MockDriver with playback
   * - If fixture doesn't exist → records, saves, returns MockDriver
   */
  async driver(name: string, options: DriverOptions): Promise<Driver> {
    const fixturePath = this.getFixturePath(name);

    // Check if fixture exists
    if (!options.forceRecord && existsSync(fixturePath)) {
      logger.info("Loading existing fixture", { name, path: fixturePath });
      const fixture = await this.loadFixture(fixturePath);
      return new MockDriver({ fixture });
    }

    // Need to record
    logger.info("Recording new fixture", { name, message: options.message });
    const fixture = await this.record(name, options);
    return new MockDriver({ fixture });
  }

  /**
   * Get a DriverFactory that uses fixtures
   */
  factory(name: string, options: DriverOptions): DriverFactory {
    const self = this;
    return {
      name: `DevtoolsFactory(${name})`,
      createDriver: () => {
        // Return a lazy driver that loads/records on first use
        return new LazyDriver(async () => {
          return self.driver(name, options);
        });
      },
    };
  }

  /**
   * Record a fixture
   */
  async record(name: string, options: DriverOptions): Promise<Fixture> {
    const factory = await this.getRealDriverFactory();
    const { EventBusImpl } = await import("@agentxjs/core/event");

    const bus = new EventBusImpl();
    const agentId = `record-${name}`;

    // Create real driver
    const realDriver = factory.createDriver({
      agentId,
      config: {
        apiKey: this.config.apiKey!,
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        systemPrompt:
          options.systemPrompt || this.config.systemPrompt || "You are a helpful assistant.",
        cwd: options.cwd || this.config.cwd || process.cwd(),
      },
    });

    // Wrap with recorder
    const recorder = new RecordingDriver({
      driver: realDriver,
      name,
      description: `Recording of: "${options.message}"`,
    });

    // Connect
    recorder.connect(bus.asConsumer(), bus.asProducer());

    // Wait for completion
    const fixture = await new Promise<Fixture>((resolve, reject) => {
      const timeout = setTimeout(() => {
        recorder.dispose();
        reject(new Error(`Recording timeout for: ${name}`));
      }, 120000);

      bus.on("message_stop", (evt) => {
        const data = evt.data as { stopReason?: string };
        if (data.stopReason === "end_turn") {
          clearTimeout(timeout);
          const fixture = recorder.getFixture();
          recorder.dispose();
          resolve(fixture);
        }
      });

      bus.on("error_received", (evt) => {
        clearTimeout(timeout);
        recorder.dispose();
        const data = evt.data as { message?: string };
        reject(new Error(`Recording error: ${data.message}`));
      });

      // Send message
      bus.emit({
        type: "user_message",
        timestamp: Date.now(),
        source: "devtools",
        category: "message",
        intent: "request",
        data: {
          id: `msg_${Date.now()}`,
          role: "user",
          subtype: "user",
          content: options.message,
          timestamp: Date.now(),
        },
        context: {
          agentId,
          sessionId: `session-${name}`,
        },
      } as never);
    });

    // Save fixture
    await this.saveFixture(name, fixture);

    return fixture;
  }

  /**
   * Load a fixture by name
   */
  async load(name: string): Promise<Fixture> {
    const fixturePath = this.getFixturePath(name);
    return this.loadFixture(fixturePath);
  }

  /**
   * Check if a fixture exists
   */
  exists(name: string): boolean {
    return existsSync(this.getFixturePath(name));
  }

  /**
   * Delete a fixture
   */
  async delete(name: string): Promise<void> {
    const fixturePath = this.getFixturePath(name);
    if (existsSync(fixturePath)) {
      const { unlink } = await import("node:fs/promises");
      await unlink(fixturePath);
      logger.info("Fixture deleted", { name });
    }
  }

  // ==================== Private ====================

  private getFixturePath(name: string): string {
    // If name is already a path, use it directly
    if (name.endsWith(".json")) {
      return name;
    }
    return join(this.config.fixturesDir, `${name}.json`);
  }

  private async loadFixture(path: string): Promise<Fixture> {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as Fixture;
  }

  private async saveFixture(name: string, fixture: Fixture): Promise<void> {
    const path = this.getFixturePath(name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(fixture, null, 2), "utf-8");
    logger.info("Fixture saved", { name, path, eventCount: fixture.events.length });
  }

  private async getRealDriverFactory(): Promise<DriverFactory> {
    if (this.realDriverFactory) {
      return this.realDriverFactory;
    }

    if (this.config.driverFactory) {
      this.realDriverFactory = this.config.driverFactory;
      return this.realDriverFactory;
    }

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error(
        "apiKey is required for recording. Set it in DevtoolsConfig or provide a driverFactory."
      );
    }

    // Try to import claude-driver
    try {
      const { createClaudeDriverFactory } = await import("@agentxjs/claude-driver");
      this.realDriverFactory = createClaudeDriverFactory();
      return this.realDriverFactory;
    } catch {
      throw new Error("@agentxjs/claude-driver not found. Install it or provide a driverFactory.");
    }
  }
}

/**
 * LazyDriver - Loads the actual driver on first connect
 */
class LazyDriver implements Driver {
  readonly name = "LazyDriver";
  private driver: Driver | null = null;
  private connectPending: {
    consumer: import("@agentxjs/core/event").EventConsumer;
    producer: import("@agentxjs/core/event").EventProducer;
  } | null = null;

  constructor(loader: () => Promise<Driver>) {
    loader().then((driver) => {
      this.driver = driver;
      // If connect was called before driver loaded, connect now
      if (this.connectPending) {
        driver.connect(this.connectPending.consumer, this.connectPending.producer);
        this.connectPending = null;
      }
      return driver;
    });
  }

  connect(
    consumer: import("@agentxjs/core/event").EventConsumer,
    producer: import("@agentxjs/core/event").EventProducer
  ): void {
    if (this.driver) {
      this.driver.connect(consumer, producer);
    } else {
      // Driver not ready yet, save for later
      this.connectPending = { consumer, producer };
    }
  }

  disconnect(): void {
    this.driver?.disconnect();
  }

  dispose(): void {
    this.driver?.dispose();
  }
}

/**
 * Create a Devtools instance
 */
export function createDevtools(config: DevtoolsConfig): Devtools {
  return new Devtools(config);
}
