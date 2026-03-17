/**
 * OS Initialization Tests — New Presentation API
 */

import { describe, expect, mock, test } from "bun:test";
import { Presentation } from "../Presentation";
import type { PresentationOS } from "../types";

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

describe("OS initialization in Presentation", () => {
  test("constructor calls os.list('.') and populates os.files", async () => {
    const mockFiles = [
      { name: "src", path: "src", type: "directory" as const },
      { name: "package.json", path: "package.json", type: "file" as const },
    ];

    const mockOS: PresentationOS = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(mockFiles)),
    };

    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, mockOS);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockOS.list).toHaveBeenCalledWith(".");
    expect(pres.os).not.toBeNull();
    expect(pres.os!.files).toEqual(mockFiles);
  });

  test("os is null when no OS provided", async () => {
    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, null);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pres.os).toBeNull();
  });

  test("subscribe fires on OS update", async () => {
    const mockFiles = [{ name: "test.txt", path: "test.txt", type: "file" as const }];
    const mockOS: PresentationOS = {
      read: mock(() => Promise.resolve("")),
      write: mock(() => Promise.resolve()),
      list: mock(() => Promise.resolve(mockFiles)),
    };

    let notified = false;
    const ax = createMockAgentX();
    const pres = new Presentation(ax, "img_test", undefined, undefined, mockOS);
    pres.subscribe(() => {
      notified = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(notified).toBe(true);
    expect(pres.os!.files).toEqual(mockFiles);
  });

  test("workspace_tree event updates os.files", async () => {
    const initialFiles = [{ name: "init.txt", path: "init.txt", type: "file" as const }];
    const mockOS: PresentationOS = {
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

    const pres = new Presentation(ax, "img_test", undefined, undefined, mockOS);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(pres.os!.files).toEqual(initialFiles);

    // Simulate workspace_tree event
    const updatedFiles = [
      { name: "init.txt", path: "init.txt", type: "file" as const },
      { name: "new.txt", path: "new.txt", type: "file" as const },
    ];
    eventHandler!({ type: "workspace_tree", timestamp: Date.now(), data: { files: updatedFiles } });

    expect(pres.os!.files).toEqual(updatedFiles);
  });
});
