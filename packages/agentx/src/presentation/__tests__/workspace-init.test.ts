/**
 * Workspace Initialization Tests — New Presentation API
 */

import { describe, expect, mock, test } from "bun:test";
import { Presentation } from "../Presentation";
import type { PresentationWorkspace } from "../types";

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
  test("constructor calls workspace.list('.') and populates workspace.files", async () => {
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockWorkspace.list).toHaveBeenCalledWith(".");
    expect(pres.workspace).not.toBeNull();
    expect(pres.workspace!.files).toEqual(mockFiles);
  });

  test("workspace is null when no workspace provided", async () => {
    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, null);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pres.workspace).toBeNull();
  });

  test("subscribe fires on workspace update", async () => {
    const mockFiles = [{ name: "test.txt", path: "test.txt", type: "file" as const }];
    const mockWorkspace: PresentationWorkspace = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(mockFiles)),
    };

    let notified = false;
    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, mockWorkspace);
    pres.subscribe(() => {
      notified = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(notified).toBe(true);
    expect(pres.workspace!.files).toEqual(mockFiles);
  });

  test("workspace_tree event updates workspace.files", async () => {
    const initialFiles = [{ name: "init.txt", path: "init.txt", type: "file" as const }];
    const mockWorkspace: PresentationWorkspace = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(initialFiles)),
    };

    let eventHandler: ((event: any) => void) | null = null;
    const ax = createMockAgentX();
    ax.onAny = mock((handler: any) => {
      eventHandler = handler;
      return () => {};
    });

    const pres = new Presentation(ax, "img_test", undefined, undefined, mockWorkspace);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pres.workspace!.files).toEqual(initialFiles);

    // Simulate workspace_tree event
    const updatedFiles = [
      { name: "init.txt", path: "init.txt", type: "file" as const },
      { name: "new.txt", path: "new.txt", type: "file" as const },
    ];
    eventHandler!({ type: "workspace_tree", timestamp: Date.now(), data: { files: updatedFiles } });

    expect(pres.workspace!.files).toEqual(updatedFiles);
  });
});
