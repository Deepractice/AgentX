/**
 * OffsetGenerator.test.ts - Unit tests for OffsetGenerator
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { OffsetGenerator } from "../OffsetGenerator";

describe("OffsetGenerator", () => {
  let generator: OffsetGenerator;

  beforeEach(() => {
    generator = new OffsetGenerator();
  });

  describe("generate", () => {
    it("should generate an offset string", () => {
      const offset = generator.generate();

      expect(typeof offset).toBe("string");
      expect(offset.length).toBeGreaterThan(0);
    });

    it("should generate offsets in expected format", () => {
      const offset = generator.generate();

      // Format: {timestamp_base36}-{sequence_padded}
      const parts = offset.split("-");
      expect(parts).toHaveLength(2);

      // First part should be base36 timestamp
      const timestamp = parseInt(parts[0], 36);
      expect(timestamp).toBeGreaterThan(0);

      // Second part should be zero-padded sequence
      expect(parts[1]).toMatch(/^\d{4}$/);
    });

    it("should generate monotonically increasing offsets", () => {
      const offsets: string[] = [];

      for (let i = 0; i < 100; i++) {
        offsets.push(generator.generate());
      }

      // Each offset should be greater than the previous
      for (let i = 1; i < offsets.length; i++) {
        expect(OffsetGenerator.compare(offsets[i], offsets[i - 1])).toBeGreaterThan(0);
      }
    });

    it("should handle multiple offsets in same millisecond", () => {
      // Generate many offsets rapidly (likely same millisecond)
      const offsets = new Set<string>();

      for (let i = 0; i < 1000; i++) {
        offsets.add(generator.generate());
      }

      // All offsets should be unique
      expect(offsets.size).toBe(1000);
    });
  });

  describe("compare", () => {
    it("should return negative when a < b", () => {
      const a = generator.generate();
      const b = generator.generate();

      expect(OffsetGenerator.compare(a, b)).toBeLessThan(0);
    });

    it("should return positive when a > b", () => {
      const a = generator.generate();
      const b = generator.generate();

      expect(OffsetGenerator.compare(b, a)).toBeGreaterThan(0);
    });

    it("should return 0 when a == b", () => {
      const offset = generator.generate();

      expect(OffsetGenerator.compare(offset, offset)).toBe(0);
    });

    it("should compare by timestamp first", () => {
      // Create offsets with different timestamps
      const earlier = "lq5x4g1-0005"; // Earlier timestamp, higher sequence
      const later = "lq5x4g2-0001"; // Later timestamp, lower sequence

      expect(OffsetGenerator.compare(earlier, later)).toBeLessThan(0);
      expect(OffsetGenerator.compare(later, earlier)).toBeGreaterThan(0);
    });

    it("should compare by sequence when timestamps equal", () => {
      const low = "lq5x4g2-0001";
      const high = "lq5x4g2-0005";

      expect(OffsetGenerator.compare(low, high)).toBeLessThan(0);
      expect(OffsetGenerator.compare(high, low)).toBeGreaterThan(0);
    });
  });

  describe("ordering consistency", () => {
    it("should be usable for sorting", () => {
      const offsets: string[] = [];

      for (let i = 0; i < 50; i++) {
        offsets.push(generator.generate());
      }

      // Shuffle
      const shuffled = [...offsets].sort(() => Math.random() - 0.5);

      // Sort using compare
      const sorted = shuffled.sort(OffsetGenerator.compare);

      // Should match original order
      expect(sorted).toEqual(offsets);
    });
  });
});
