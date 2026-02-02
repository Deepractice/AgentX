import { describe, test, expect } from "bun:test";
import {
  isAckMessage,
  isReliableWrapper,
  type AckMessage,
  type ReliableWrapper,
} from "../../../src/protocol/reliable-message";

describe("reliable-message protocol", () => {
  describe("isAckMessage", () => {
    test("returns true for valid ACK message", () => {
      const msg: AckMessage = { __ack: "msg_123" };
      expect(isAckMessage(msg)).toBe(true);
    });

    test("returns true for ACK with extra fields", () => {
      const msg = { __ack: "msg_123", extra: "data" };
      expect(isAckMessage(msg)).toBe(true);
    });

    test("returns false for null", () => {
      expect(isAckMessage(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isAckMessage(undefined)).toBe(false);
    });

    test("returns false for string", () => {
      expect(isAckMessage("__ack")).toBe(false);
    });

    test("returns false for number", () => {
      expect(isAckMessage(123)).toBe(false);
    });

    test("returns false for object without __ack", () => {
      expect(isAckMessage({ type: "ack" })).toBe(false);
    });

    test("returns false for empty object", () => {
      expect(isAckMessage({})).toBe(false);
    });
  });

  describe("isReliableWrapper", () => {
    test("returns true for valid reliable wrapper", () => {
      const msg: ReliableWrapper = {
        __msgId: "msg_123",
        __payload: '{"type":"test"}',
      };
      expect(isReliableWrapper(msg)).toBe(true);
    });

    test("returns true for wrapper with extra fields", () => {
      const msg = {
        __msgId: "msg_123",
        __payload: "data",
        extra: "field",
      };
      expect(isReliableWrapper(msg)).toBe(true);
    });

    test("returns false for null", () => {
      expect(isReliableWrapper(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isReliableWrapper(undefined)).toBe(false);
    });

    test("returns false for object with only __msgId", () => {
      expect(isReliableWrapper({ __msgId: "123" })).toBe(false);
    });

    test("returns false for object with only __payload", () => {
      expect(isReliableWrapper({ __payload: "data" })).toBe(false);
    });

    test("returns false for empty object", () => {
      expect(isReliableWrapper({})).toBe(false);
    });

    test("returns false for array", () => {
      expect(isReliableWrapper([])).toBe(false);
    });
  });
});
