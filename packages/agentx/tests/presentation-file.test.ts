/**
 * Presentation File Support Test
 *
 * Tests that Presentation.send() correctly handles ContentPart[]
 * and addUserConversation() converts parts to blocks.
 */

import { describe, expect, test } from "bun:test";
import type { UserContentPart } from "@agentxjs/core/agent";
import { addUserConversation, createInitialState } from "../src/presentation/reducer";
import type { FileBlock, ImageBlock, TextBlock } from "../src/presentation/types";

const toBase64 = (s: string) => Buffer.from(s).toString("base64");

describe("Presentation file support", () => {
  // ==================== addUserConversation ====================

  test("string content → single TextBlock", () => {
    const state = createInitialState();
    const result = addUserConversation(state, "Hello");

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].role).toBe("user");

    const blocks = result.conversations[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as TextBlock).content).toBe("Hello");
  });

  test("ContentPart[] with text → TextBlock", () => {
    const state = createInitialState();
    const parts: UserContentPart[] = [{ type: "text", text: "Hello world" }];
    const result = addUserConversation(state, parts);

    const blocks = result.conversations[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as TextBlock).content).toBe("Hello world");
  });

  test("ContentPart[] with file → FileBlock", () => {
    const state = createInitialState();
    const parts: UserContentPart[] = [
      {
        type: "file",
        data: toBase64("file content"),
        mediaType: "application/json",
        filename: "config.json",
      },
    ];
    const result = addUserConversation(state, parts);

    const blocks = result.conversations[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("file");
    expect((blocks[0] as FileBlock).filename).toBe("config.json");
    expect((blocks[0] as FileBlock).mediaType).toBe("application/json");
  });

  test("ContentPart[] with image → ImageBlock with data URL", () => {
    const state = createInitialState();
    const imageData = toBase64("fake png data");
    const parts: UserContentPart[] = [
      {
        type: "image",
        data: imageData,
        mediaType: "image/png",
        name: "screenshot.png",
      },
    ];
    const result = addUserConversation(state, parts);

    const blocks = result.conversations[0].blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("image");
    expect((blocks[0] as ImageBlock).url).toBe(`data:image/png;base64,${imageData}`);
    expect((blocks[0] as ImageBlock).alt).toBe("screenshot.png");
  });

  test("mixed content: text + file + image → correct blocks", () => {
    const state = createInitialState();
    const parts: UserContentPart[] = [
      { type: "text", text: "Please analyze these:" },
      {
        type: "file",
        data: toBase64("name,age\nAlice,30"),
        mediaType: "text/csv",
        filename: "data.csv",
      },
      {
        type: "image",
        data: toBase64("fake image"),
        mediaType: "image/jpeg",
        name: "photo.jpg",
      },
    ];
    const result = addUserConversation(state, parts);

    const blocks = result.conversations[0].blocks;
    expect(blocks).toHaveLength(3);

    // Text
    expect(blocks[0].type).toBe("text");
    expect((blocks[0] as TextBlock).content).toBe("Please analyze these:");

    // File
    expect(blocks[1].type).toBe("file");
    expect((blocks[1] as FileBlock).filename).toBe("data.csv");
    expect((blocks[1] as FileBlock).mediaType).toBe("text/csv");

    // Image
    expect(blocks[2].type).toBe("image");
    expect((blocks[2] as ImageBlock).alt).toBe("photo.jpg");
  });

  test("file without filename → defaults to 'file'", () => {
    const state = createInitialState();
    const parts: UserContentPart[] = [
      {
        type: "file",
        data: toBase64("content"),
        mediaType: "text/plain",
      },
    ];
    const result = addUserConversation(state, parts);

    const block = result.conversations[0].blocks[0] as FileBlock;
    expect(block.filename).toBe("file");
  });

  test("multiple sends append conversations", () => {
    let state = createInitialState();

    state = addUserConversation(state, "First message");
    state = addUserConversation(state, [
      { type: "text", text: "Second with file" },
      { type: "file", data: toBase64("{}"), mediaType: "application/json", filename: "a.json" },
    ]);

    expect(state.conversations).toHaveLength(2);
    expect(state.conversations[0].blocks).toHaveLength(1);
    expect(state.conversations[1].blocks).toHaveLength(2);
  });

  // ==================== State immutability ====================

  test("original state is not mutated", () => {
    const state = createInitialState();
    const result = addUserConversation(state, "Hello");

    expect(state.conversations).toHaveLength(0);
    expect(result.conversations).toHaveLength(1);
  });
});
