/**
 * Store.test.ts - Unit tests for MemoryStore
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryStore, type Store } from "../../../engine/mealy/Store";

describe("MemoryStore", () => {
  let store: MemoryStore<{ count: number }>;

  beforeEach(() => {
    store = new MemoryStore<{ count: number }>();
  });

  describe("get/set", () => {
    it("should return undefined for non-existent key", () => {
      expect(store.get("unknown")).toBeUndefined();
    });

    it("should store and retrieve value", () => {
      store.set("id1", { count: 10 });
      expect(store.get("id1")).toEqual({ count: 10 });
    });

    it("should overwrite existing value", () => {
      store.set("id1", { count: 10 });
      store.set("id1", { count: 20 });
      expect(store.get("id1")).toEqual({ count: 20 });
    });

    it("should store multiple keys independently", () => {
      store.set("id1", { count: 1 });
      store.set("id2", { count: 2 });
      store.set("id3", { count: 3 });

      expect(store.get("id1")).toEqual({ count: 1 });
      expect(store.get("id2")).toEqual({ count: 2 });
      expect(store.get("id3")).toEqual({ count: 3 });
    });
  });

  describe("has", () => {
    it("should return false for non-existent key", () => {
      expect(store.has("unknown")).toBe(false);
    });

    it("should return true for existing key", () => {
      store.set("id1", { count: 10 });
      expect(store.has("id1")).toBe(true);
    });
  });

  describe("delete", () => {
    it("should remove existing key", () => {
      store.set("id1", { count: 10 });
      store.delete("id1");
      expect(store.has("id1")).toBe(false);
      expect(store.get("id1")).toBeUndefined();
    });

    it("should not throw when deleting non-existent key", () => {
      expect(() => store.delete("unknown")).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      store.set("id1", { count: 1 });
      store.set("id2", { count: 2 });
      store.clear();

      expect(store.has("id1")).toBe(false);
      expect(store.has("id2")).toBe(false);
      expect(store.size).toBe(0);
    });
  });

  describe("size", () => {
    it("should return 0 for empty store", () => {
      expect(store.size).toBe(0);
    });

    it("should return correct count", () => {
      store.set("id1", { count: 1 });
      expect(store.size).toBe(1);

      store.set("id2", { count: 2 });
      expect(store.size).toBe(2);

      store.delete("id1");
      expect(store.size).toBe(1);
    });
  });

  describe("keys", () => {
    it("should return empty iterator for empty store", () => {
      const keys = Array.from(store.keys());
      expect(keys).toEqual([]);
    });

    it("should return all stored keys", () => {
      store.set("id1", { count: 1 });
      store.set("id2", { count: 2 });

      const keys = Array.from(store.keys());
      expect(keys).toContain("id1");
      expect(keys).toContain("id2");
      expect(keys.length).toBe(2);
    });
  });

  describe("Store interface compliance", () => {
    it("should implement Store interface", () => {
      const genericStore: Store<{ count: number }> = new MemoryStore();

      genericStore.set("id", { count: 5 });
      expect(genericStore.get("id")).toEqual({ count: 5 });
      expect(genericStore.has("id")).toBe(true);
      genericStore.delete("id");
      expect(genericStore.has("id")).toBe(false);
    });
  });
});
