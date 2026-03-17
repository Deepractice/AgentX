/**
 * Presentation OS Tests
 *
 * Tests the OS integration in the Presentation layer:
 * 1. Reducer handles workspace_tree events → updates PresentationState.os
 * 2. PresentationOS operations (read/write/list)
 * 3. Initial state has os: null
 */

import { describe, expect, test } from "bun:test";
import { createInitialState, presentationReducer } from "../reducer";
import type { FileTreeEntry, PresentationState } from "../types";

// ============================================================================
// Reducer: workspace_tree event
// ============================================================================

describe("Presentation OS Reducer", () => {
  test("initial state has os: null", () => {
    const state = createInitialState();
    expect(state.os).toBeNull();
  });

  test("workspace_tree event sets os.files", () => {
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
    expect(newState.os).not.toBeNull();
    expect(newState.os!.files).toEqual(files);
  });

  test("workspace_tree event replaces previous files", () => {
    const state: PresentationState = {
      ...createInitialState(),
      os: {
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
    expect(newState.os!.files).toEqual(newFiles);
    expect(newState.os!.files).not.toContainEqual({
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
    expect(newState.os).toEqual({ files: [] });
  });

  test("unknown event does not create os state", () => {
    const state = createInitialState();
    const event = {
      type: "some_unknown_event",
      timestamp: Date.now(),
      data: {},
    };

    const newState = presentationReducer(state, event as any);
    expect(newState.os).toBeNull();
    expect(newState).toBe(state); // Same reference = no change
  });
});
