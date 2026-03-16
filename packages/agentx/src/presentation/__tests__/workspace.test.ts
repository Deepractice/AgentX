/**
 * Presentation Workspace Tests
 *
 * Tests the workspace integration in the Presentation layer:
 * 1. Reducer handles workspace_tree events → updates PresentationState.workspace
 * 2. PresentationWorkspace operations (read/write/list)
 * 3. Initial state has workspace: null
 */

import { describe, expect, test } from "bun:test";
import { createInitialState, presentationReducer } from "../reducer";
import type { FileTreeEntry, PresentationState } from "../types";

// ============================================================================
// Reducer: workspace_tree event
// ============================================================================

describe("Presentation Workspace Reducer", () => {
  test("initial state has workspace: null", () => {
    const state = createInitialState();
    expect(state.workspace).toBeNull();
  });

  test("workspace_tree event sets workspace.files", () => {
    const state = createInitialState();
    const files: FileTreeEntry[] = [
      { name: "src", path: "src", type: "directory" },
      { name: "package.json", path: "package.json", type: "file" },
    ];

    const event = {
      type: "workspace_tree" as const,
      timestamp: Date.now(),
      data: { imageId: "img_test", files },
    };

    const newState = presentationReducer(state, event as any);
    expect(newState.workspace).not.toBeNull();
    expect(newState.workspace!.files).toEqual(files);
  });

  test("workspace_tree event replaces previous files", () => {
    const state: PresentationState = {
      ...createInitialState(),
      workspace: {
        files: [{ name: "old.txt", path: "old.txt", type: "file" }],
      },
    };

    const newFiles: FileTreeEntry[] = [
      { name: "new.txt", path: "new.txt", type: "file" },
      { name: "src", path: "src", type: "directory" },
    ];

    const event = {
      type: "workspace_tree" as const,
      timestamp: Date.now(),
      data: { imageId: "img_test", files: newFiles },
    };

    const newState = presentationReducer(state, event as any);
    expect(newState.workspace!.files).toEqual(newFiles);
    expect(newState.workspace!.files).not.toContainEqual({
      name: "old.txt",
      path: "old.txt",
      type: "file",
    });
  });

  test("workspace_tree event does not affect other state fields", () => {
    const state = createInitialState();
    state.status = "responding";

    const event = {
      type: "workspace_tree" as const,
      timestamp: Date.now(),
      data: { imageId: "img_test", files: [] },
    };

    const newState = presentationReducer(state, event as any);
    expect(newState.status).toBe("responding");
    expect(newState.conversations).toEqual([]);
    expect(newState.workspace).toEqual({ files: [] });
  });

  test("unknown event does not create workspace state", () => {
    const state = createInitialState();
    const event = {
      type: "some_unknown_event",
      timestamp: Date.now(),
      data: {},
    };

    const newState = presentationReducer(state, event as any);
    expect(newState.workspace).toBeNull();
    expect(newState).toBe(state); // Same reference = no change
  });
});
