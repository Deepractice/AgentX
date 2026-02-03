/**
 * BDD World - Shared context for all step definitions
 *
 * VCR Mode:
 * - Fixture exists → playback (MockDriver)
 * - Fixture missing → record (real API + RecordingDriver)
 *
 * To re-record a scenario, delete its fixture file.
 */

import {
  setWorldConstructor,
  World,
  BeforeAll,
  AfterAll,
  Before,
  After,
  type IWorldOptions,
} from "@cucumber/cucumber";
import type { AgentX, BaseResponse } from "agentxjs";
import type { BusEvent, Unsubscribe } from "@agentxjs/core/event";
import type { AgentXServer } from "@agentxjs/server";
import type { Driver, DriverFactory } from "@agentxjs/core/driver";

// ============================================================================
// VCR Configuration
// ============================================================================

const FIXTURES_DIR = "fixtures/recording/agentx";

// Global registry: agentId → fixtureName
const fixtureRegistry = new Map<string, string>();

// Current scenario's fixture name (set by Before hook)
let currentFixtureName: string | null = null;

export function setCurrentFixture(name: string): void {
  currentFixtureName = name;
}

export function registerAgentFixture(agentId: string, fixtureName: string): void {
  fixtureRegistry.set(agentId, fixtureName);
}

// ============================================================================
// Test Server Management
// ============================================================================

let testServer: AgentXServer | null = null;
let testPort: number = 15300;

BeforeAll({ timeout: 60000 }, async function () {
  const { createServer } = await import("@agentxjs/server");
  const { createNodeProvider } = await import("@agentxjs/node-provider");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } =
    await import("node:fs");

  const tempDir = mkdtempSync(join(tmpdir(), "agentx-bdd-"));
  const fixturesPath = resolve(process.cwd(), FIXTURES_DIR);

  // Ensure fixtures directory exists
  if (!existsSync(fixturesPath)) {
    mkdirSync(fixturesPath, { recursive: true });
  }

  // API config for recording
  const apiKey = process.env.DEEPRACTICE_API_KEY;
  const baseUrl = process.env.DEEPRACTICE_BASE_URL;
  const model = process.env.DEEPRACTICE_MODEL || "claude-haiku-4-5-20251001";

  console.log(`\n[BDD] VCR Mode - fixtures: ${FIXTURES_DIR}/\n`);

  // Pre-load modules for VCR
  const { MockDriver, createRecordingDriver } = await import("@agentxjs/devtools");
  const { createClaudeDriverFactory } = await import("@agentxjs/claude-driver");
  const claudeFactory = createClaudeDriverFactory();

  // Create VCR-aware DriverFactory
  const vcrDriverFactory: DriverFactory = {
    name: "vcr-driver",
    createDriver: (options: { agentId: string; config: Record<string, unknown> }): Driver => {
      const { agentId, config } = options;

      // Get fixture name from registry or use current scenario's fixture
      const fixtureName = fixtureRegistry.get(agentId) || currentFixtureName || agentId;
      const fixturePath = join(fixturesPath, `${fixtureName}.json`);

      if (existsSync(fixturePath)) {
        // Fixture exists → MockDriver (playback)
        console.log(`[VCR] Playback: ${fixtureName}`);

        const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));
        return new MockDriver({ fixture });
      } else {
        // No fixture → RecordingDriver (record)
        if (!apiKey) {
          throw new Error(
            `No fixture found for "${fixtureName}" and DEEPRACTICE_API_KEY not set. ` +
              `Either create the fixture or set API key to record.`
          );
        }

        console.log(`[VCR] Recording: ${fixtureName}`);

        const realDriver = claudeFactory.createDriver({
          agentId,
          config: {
            ...config,
            apiKey,
            baseUrl,
            model,
          },
        });

        const recorder = createRecordingDriver({
          driver: realDriver,
          name: fixtureName,
          description: `BDD scenario: ${fixtureName}`,
        });

        // Save fixture when driver disconnects or disposes
        let fixtureSaved = false;
        const saveFixture = () => {
          if (fixtureSaved) return;
          if (recorder.eventCount > 0) {
            try {
              const fixture = recorder.getFixture();
              writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), "utf-8");
              console.log(`[VCR] Saved: ${fixtureName} (${recorder.eventCount} events)`);
              fixtureSaved = true;
            } catch (e) {
              console.error(`[VCR] Failed to save: ${fixtureName}`, e);
            }
          }
        };

        // Hook into disconnect event to save fixture
        const originalDisconnect = recorder.disconnect?.bind(recorder);
        if (originalDisconnect) {
          recorder.disconnect = () => {
            saveFixture();
            return originalDisconnect();
          };
        }

        // Also save on dispose as fallback
        const originalDispose = recorder.dispose.bind(recorder);
        recorder.dispose = async () => {
          saveFixture();
          return originalDispose();
        };

        return recorder;
      }
    },
  };

  const provider = await createNodeProvider({
    dataPath: tempDir,
    driverFactory: vcrDriverFactory,
  });

  testServer = await createServer({
    provider,
    port: testPort,
  });

  await testServer.listen();
  console.log(`[BDD] Test server started on ws://localhost:${testPort}\n`);
});

AfterAll({ timeout: 30000 }, async function () {
  if (testServer) {
    await testServer.dispose();
    testServer = null;
    console.log("\n[BDD] Test server stopped\n");
  }
});

// ============================================================================
// World Class
// ============================================================================

export class AgentXWorld extends World {
  agentx?: AgentX;
  lastResponse?: BaseResponse;
  collectedEvents: BusEvent[] = [];
  private eventHandlers: Unsubscribe[] = [];
  savedValues: Map<string, string> = new Map();
  scenarioName: string = "";

  constructor(options: IWorldOptions) {
    super(options);
  }

  static getTestServerPort(): number {
    return testPort;
  }

  static getTestServerUrl(): string {
    return `ws://localhost:${testPort}`;
  }

  subscribeToEvent(type: string): void {
    if (!this.agentx) throw new Error("AgentX not initialized");
    const unsubscribe = this.agentx.on(type, (event) => {
      this.collectedEvents.push(event);
    });
    this.eventHandlers.push(unsubscribe);
  }

  subscribeToAllEvents(): void {
    if (!this.agentx) throw new Error("AgentX not initialized");
    const unsubscribe = this.agentx.onAny((event) => {
      this.collectedEvents.push(event);
    });
    this.eventHandlers.push(unsubscribe);
  }

  getEventsOfType(type: string): BusEvent[] {
    return this.collectedEvents.filter((e) => e.type === type);
  }

  async waitForEvent(type: string, timeout = 5000): Promise<BusEvent> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const events = this.getEventsOfType(type);
      if (events.length > 0) {
        return events[events.length - 1];
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`Timeout waiting for event: ${type}`);
  }

  clearEvents(): void {
    this.collectedEvents = [];
  }

  async cleanup(): Promise<void> {
    for (const unsubscribe of this.eventHandlers) {
      unsubscribe();
    }
    this.eventHandlers = [];
    if (this.agentx) {
      await this.agentx.dispose();
      this.agentx = undefined;
    }
    this.lastResponse = undefined;
    this.collectedEvents = [];
    this.savedValues.clear();
  }
}

setWorldConstructor(AgentXWorld);

Before(async function (this: AgentXWorld, scenario) {
  // Set current fixture name from scenario
  const name = scenario.pickle.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  this.scenarioName = name;
  setCurrentFixture(name);

  this.collectedEvents = [];
  this.savedValues.clear();
  this.lastResponse = undefined;
});

After(async function (this: AgentXWorld) {
  await this.cleanup();
  setCurrentFixture(null as unknown as string);
  fixtureRegistry.clear();
});
