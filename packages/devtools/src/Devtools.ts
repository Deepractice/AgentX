/**
 * Devtools SDK - VCR-style fixture management
 *
 * Automatically uses existing fixtures or records new ones on-the-fly.
 *
 * Usage:
 * ```typescript
 * import { createDevtools } from "@agentxjs/devtools";
 *
 * import { env } from "@agentxjs/devtools";
 *
 * const devtools = createDevtools({
 *   fixturesDir: "./fixtures",
 *   apiKey: env.apiKey,
 * });
 *
 * // Has fixture → playback (MockDriver)
 * // No fixture → call API, record, save, return MockDriver
 * const driver = await devtools.driver("hello-test", {
 *   message: "Hello!",
 * });
 *
 * await driver.initialize();
 * for await (const event of driver.receive({ content: "Hello" })) {
 *   console.log(event);
 * }
 * ```
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CreateDriver, Driver, DriverConfig } from "@agentxjs/core/driver";
import { createLogger } from "commonxjs/logger";
import { MockDriver } from "./mock/MockDriver";
import { RecordingDriver } from "./recorder/RecordingDriver";
import type { Fixture } from "./types";

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
  createDriver?: CreateDriver;
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
  private realCreateDriver: CreateDriver | null = null;

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
   * Get a CreateDriver function that uses a pre-loaded fixture
   *
   * NOTE: This loads the fixture synchronously, so the fixture must exist.
   * For async loading/recording, use driver() instead.
   */
  createDriverForFixture(fixturePath: string): CreateDriver {
    // Load fixture synchronously (requires existing fixture)
    const content = readFileSync(this.getFixturePath(fixturePath), "utf-8");
    const fixture = JSON.parse(content) as Fixture;

    return (_config: DriverConfig) => {
      return new MockDriver({ fixture });
    };
  }

  /**
   * Record a fixture
   */
  async record(name: string, options: DriverOptions): Promise<Fixture> {
    const createDriver = await this.getRealCreateDriver();

    const agentId = `record-${name}`;

    // Create driver config
    const driverConfig: DriverConfig = {
      apiKey: this.config.apiKey!,
      baseUrl: this.config.baseUrl,
      agentId,
      model: this.config.model,
      systemPrompt:
        options.systemPrompt || this.config.systemPrompt || "You are a helpful assistant.",
      cwd: options.cwd || this.config.cwd || process.cwd(),
    };

    // Create real driver
    const realDriver = createDriver(driverConfig);

    // Wrap with recorder
    const recorder = new RecordingDriver({
      driver: realDriver,
      name,
      description: `Recording of: "${options.message}"`,
    });

    // Initialize
    await recorder.initialize();

    try {
      // Build user message
      const userMessage = {
        id: `msg_${Date.now()}`,
        role: "user" as const,
        subtype: "user" as const,
        content: options.message,
        timestamp: Date.now(),
      };

      // Send message and collect all events
      for await (const event of recorder.receive(userMessage)) {
        logger.debug("Recording event", { type: event.type });

        // Check for completion
        if (event.type === "message_stop") {
          break;
        }

        // Check for error
        if (event.type === "error") {
          const errorData = event.data as { message?: string };
          throw new Error(`Recording error: ${errorData.message}`);
        }
      }

      // Get fixture
      const fixture = recorder.getFixture();

      // Save fixture
      await this.saveFixture(name, fixture);

      return fixture;
    } finally {
      // Cleanup
      await recorder.dispose();
    }
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

  private async getRealCreateDriver(): Promise<CreateDriver> {
    if (this.realCreateDriver) {
      return this.realCreateDriver;
    }

    if (this.config.createDriver) {
      this.realCreateDriver = this.config.createDriver;
      return this.realCreateDriver;
    }

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error(
        "apiKey is required for recording. Set it in DevtoolsConfig or provide a createDriver."
      );
    }

    // Try to import claude-driver
    try {
      const { createClaudeDriver } = await import("@agentxjs/claude-driver");
      this.realCreateDriver = createClaudeDriver;
      return this.realCreateDriver;
    } catch {
      throw new Error("@agentxjs/claude-driver not found. Install it or provide a createDriver.");
    }
  }
}

/**
 * Create a Devtools instance
 */
export function createDevtools(config: DevtoolsConfig): Devtools {
  return new Devtools(config);
}

// ============================================================================
// VCR CreateDriver Factory
// ============================================================================

/**
 * Configuration for VCR-aware CreateDriver
 */
export interface VcrCreateDriverConfig {
  /**
   * Directory to store/load fixtures
   */
  fixturesDir: string;

  /**
   * Get current fixture name. Return null to skip VCR (use real driver).
   * Called when driver is created.
   */
  getFixtureName: () => string | null;

  /**
   * API key for recording
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
   * Real driver factory (optional, defaults to @agentxjs/claude-driver)
   */
  createRealDriver?: CreateDriver;

  /**
   * Called when playback mode is used
   */
  onPlayback?: (fixtureName: string) => void;

  /**
   * Called when recording mode is used
   */
  onRecording?: (fixtureName: string) => void;

  /**
   * Called when fixture is saved
   */
  onSaved?: (fixtureName: string, eventCount: number) => void;
}

/**
 * Create a VCR-aware CreateDriver function
 *
 * VCR logic (hardcoded):
 * - Fixture exists → Playback (MockDriver)
 * - Fixture missing → Recording (RecordingDriver) → Auto-save on dispose
 *
 * @example
 * ```typescript
 * let currentFixture: string | null = null;
 *
 * const vcrCreateDriver = createVcrCreateDriver({
 *   fixturesDir: "./fixtures",
 *   getFixtureName: () => currentFixture,
 *   apiKey: process.env.API_KEY,
 * });
 *
 * // Before each test:
 * currentFixture = "test-scenario-name";
 *
 * // Use with server:
 * const platform = await createNodePlatform({...});
 * const server = await createServer({
 *   platform,
 *   createDriver: vcrCreateDriver,
 * });
 * ```
 */
export function createVcrCreateDriver(config: VcrCreateDriverConfig): CreateDriver {
  const { fixturesDir, getFixtureName, apiKey, baseUrl, model, onPlayback, onRecording, onSaved } =
    config;

  // Real driver factory (must be provided or pre-loaded)
  const realCreateDriver: CreateDriver | null = config.createRealDriver || null;

  return (driverConfig: DriverConfig): Driver => {
    const fixtureName = getFixtureName();

    // No fixture name → use real driver without VCR
    if (!fixtureName) {
      if (!apiKey) {
        throw new Error("No fixture name and no API key. Cannot create driver.");
      }

      // Sync: we need to return immediately, so we create the driver with merged config
      // Note: This path is for non-VCR scenarios
      const createDriver = realCreateDriver || config.createRealDriver;
      if (!createDriver) {
        throw new Error("No createRealDriver provided and claude-driver not loaded yet.");
      }

      return createDriver({
        ...driverConfig,
        apiKey,
        baseUrl,
        model,
      });
    }

    const fixturePath = join(fixturesDir, `${fixtureName}.json`);

    // Fixture exists → Playback (MockDriver)
    if (existsSync(fixturePath)) {
      onPlayback?.(fixtureName);
      logger.info("VCR Playback", { fixtureName });

      const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as Fixture;
      return new MockDriver({ fixture });
    }

    // No fixture → Recording (RecordingDriver)
    if (!apiKey) {
      throw new Error(
        `No fixture found for "${fixtureName}" and no API key for recording. ` +
          `Either create the fixture or provide an API key.`
      );
    }

    onRecording?.(fixtureName);
    logger.info("VCR Recording", { fixtureName });

    // Get real driver factory (sync - must be pre-loaded or provided)
    const createDriver = realCreateDriver || config.createRealDriver;
    if (!createDriver) {
      throw new Error(
        "createRealDriver not available. For async loading, ensure claude-driver is pre-loaded."
      );
    }

    // Create real driver with merged config
    const realDriver = createDriver({
      ...driverConfig,
      apiKey,
      baseUrl,
      model,
    });

    // Wrap with RecordingDriver
    const recorder = new RecordingDriver({
      driver: realDriver,
      name: fixtureName,
      description: `VCR recording: ${fixtureName}`,
    });

    // Auto-save fixture on dispose
    let fixtureSaved = false;
    const originalDispose = recorder.dispose.bind(recorder);

    recorder.dispose = async () => {
      if (!fixtureSaved && recorder.eventCount > 0) {
        try {
          const fixture = recorder.getFixture();

          // Ensure directory exists
          const { mkdir, writeFile } = await import("node:fs/promises");
          await mkdir(dirname(fixturePath), { recursive: true });
          await writeFile(fixturePath, JSON.stringify(fixture, null, 2), "utf-8");

          fixtureSaved = true;
          onSaved?.(fixtureName, recorder.eventCount);
          logger.info("VCR Saved", { fixtureName, eventCount: recorder.eventCount });
        } catch (e) {
          logger.error("VCR Save failed", { fixtureName, error: e });
        }
      }

      return originalDispose();
    };

    return recorder;
  };
}
