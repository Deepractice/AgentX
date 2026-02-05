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
import type { AgentX, BaseResponse, Presentation, PresentationState } from "agentxjs";
import type { BusEvent, Unsubscribe } from "@agentxjs/core/event";
import type { Driver, DriverStreamEvent } from "@agentxjs/core/driver";
import type { AgentXServer } from "@agentxjs/server";

// ============================================================================
// VCR Configuration
// ============================================================================

const FIXTURES_DIR = "fixtures/recording/agentx";

// Current scenario's fixture name (set by Before hook)
let currentFixtureName: string | null = null;

export function setCurrentFixture(name: string): void {
  currentFixtureName = name;
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
  const { mkdtempSync, mkdirSync, existsSync } = await import("node:fs");

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

  // Use MonoDriver as default driver
  const { createMonoDriver } = await import("@agentxjs/mono-driver");
  const { createVcrCreateDriver } = await import("@agentxjs/devtools");

  // Create VCR-aware CreateDriver using devtools
  const vcrCreateDriver = createVcrCreateDriver({
    fixturesDir: fixturesPath,
    getFixtureName: () => {
      return currentFixtureName;
    },
    apiKey,
    baseUrl,
    model,
    createRealDriver: createMonoDriver as any,
    onPlayback: (name) => console.log(`[VCR] Playback: ${name}`),
    onRecording: (name) => console.log(`[VCR] Recording: ${name}`),
    onSaved: (name, count) => console.log(`[VCR] Saved: ${name} (${count} events)`),
  });

  const provider = await createNodeProvider({
    dataPath: tempDir,
    createDriver: vcrCreateDriver,
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

  // MonoDriver direct testing support
  monoDriver?: Driver;
  driverEvents: DriverStreamEvent[] = [];

  // Presentation support
  presentation?: Presentation;
  presentationStates: PresentationState[] = [];
  presentationComplete: boolean = false;
  presentationDisposed: boolean = false;
  presentationUpdateCount: number = 0;

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

    // Cleanup MonoDriver
    if (this.monoDriver) {
      await this.monoDriver.dispose();
      this.monoDriver = undefined;
    }
    this.driverEvents = [];

    // Cleanup presentation
    if (this.presentation && !this.presentationDisposed) {
      this.presentation.dispose();
      this.presentation = undefined;
    }
    this.presentationStates = [];
    this.presentationComplete = false;
    this.presentationDisposed = false;
    this.presentationUpdateCount = 0;

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
});
