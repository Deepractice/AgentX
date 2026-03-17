/**
 * Workspace Initialization Tests
 *
 * Verifies that Presentation correctly loads initial workspace file tree.
 * Covers the timing issue: workspace_tree event may be lost if Presentation
 * hasn't subscribed yet, so the constructor must call workspace.list(".").
 */

import { describe, expect, mock, test } from "bun:test";
import { Presentation } from "../Presentation";
import type { PresentationWorkspace } from "../types";

// Minimal AgentX mock
function createMockAgentX() {
  return {
    runtime: {
      session: { send: mock(() => Promise.resolve({ instanceId: "inst_1" })) },
      image: {},
      present: {},
      llm: {},
    },
    onAny: mock(() => () => {}),
    rpc: mock(() => Promise.resolve({})),
  } as any;
}

describe("Workspace initialization in Presentation", () => {
  test("constructor calls workspace.list('.') when workspace is provided", async () => {
    const mockFiles = [
      { name: "src", path: "src", type: "directory" as const },
      { name: "package.json", path: "package.json", type: "file" as const },
    ];

    const mockWorkspace: PresentationWorkspace = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(mockFiles)),
    };

    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, mockWorkspace);

    // Wait for async list to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockWorkspace.list).toHaveBeenCalledWith(".");
    expect(pres.getState().workspace).not.toBeNull();
    expect(pres.getState().workspace!.files).toEqual(mockFiles);
  });

  test("constructor does NOT call list when workspace is null", async () => {
    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, null);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pres.getState().workspace).toBeNull();
  });

  test("onUpdate receives workspace state after initial load", async () => {
    const mockFiles = [{ name: "test.txt", path: "test.txt", type: "file" as const }];
    const mockWorkspace: PresentationWorkspace = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(mockFiles)),
    };

    const states: any[] = [];
    const ax = createMockAgentX();
    const pres = new Presentation(
      ax,
      "img_test",
      {
        onUpdate: (state) => {
          states.push(state);
        },
      },
      undefined,
      mockWorkspace
    );

    // Wait for async list + notify
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should have received at least one update with workspace files
    const withWorkspace = states.find((s) => s.workspace !== null);
    expect(withWorkspace).toBeDefined();
    expect(withWorkspace.workspace.files).toEqual(mockFiles);
  });

  test("workspace_tree event still works after initial load", async () => {
    const initialFiles = [{ name: "init.txt", path: "init.txt", type: "file" as const }];
    const mockWorkspace: PresentationWorkspace = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(initialFiles)),
    };

    // Capture the onAny handler
    let eventHandler: ((event: any) => void) | null = null;
    const ax = createMockAgentX();
    ax.onAny = mock((handler: any) => {
      eventHandler = handler;
      return () => {};
    });

    const pres = new Presentation(ax, "img_test", undefined, undefined, mockWorkspace);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initial load should have files
    expect(pres.getState().workspace!.files).toEqual(initialFiles);

    // Now simulate a workspace_tree event (e.g. from watcher)
    const updatedFiles = [
      { name: "init.txt", path: "init.txt", type: "file" as const },
      { name: "new.txt", path: "new.txt", type: "file" as const },
    ];

    eventHandler!({
      type: "workspace_tree",
      timestamp: Date.now(),
      data: { files: updatedFiles },
    });

    // State should reflect the new files
    expect(pres.getState().workspace!.files).toEqual(updatedFiles);
  });
});
