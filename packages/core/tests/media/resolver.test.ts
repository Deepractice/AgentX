import { describe, expect, test } from "bun:test";
import type { FilePart, TextPart, UserContentPart } from "../../src/agent/types";
import { createMediaResolver, UnsupportedMediaTypeError } from "../../src/media/resolver";
import { passthrough, textExtract } from "../../src/media/strategies";

/** Helper: encode string to base64 */
const toBase64 = (s: string) => Buffer.from(s).toString("base64");

/** Anthropic-like strategy chain */
const anthropicStrategies = [
  passthrough(["image/*", "application/pdf", "text/plain"]),
  textExtract(["text/markdown", "text/csv", "text/html", "text/xml", "application/json"]),
];

describe("MediaResolver", () => {
  const resolver = createMediaResolver(anthropicStrategies);

  // ==================== Passthrough ====================

  test("passes through text parts unchanged", async () => {
    const parts: UserContentPart[] = [{ type: "text", text: "hello" }];
    const result = await resolver.resolve(parts);
    expect(result).toEqual(parts);
  });

  test("passes through image parts unchanged", async () => {
    const parts: UserContentPart[] = [
      { type: "image", data: "base64data", mediaType: "image/png" },
    ];
    const result = await resolver.resolve(parts);
    expect(result).toEqual(parts);
  });

  test("passes through image/jpeg file", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("fake image data"),
      mediaType: "image/jpeg",
      filename: "photo.jpg",
    };
    const result = await resolver.resolve([file]);
    expect(result).toEqual([file]);
  });

  test("passes through application/pdf file", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("fake pdf"),
      mediaType: "application/pdf",
      filename: "doc.pdf",
    };
    const result = await resolver.resolve([file]);
    expect(result).toEqual([file]);
  });

  test("passes through text/plain file", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("plain text content"),
      mediaType: "text/plain",
      filename: "readme.txt",
    };
    const result = await resolver.resolve([file]);
    expect(result).toEqual([file]);
  });

  // ==================== Text Extract ====================

  test("extracts text/markdown to TextPart", async () => {
    const content = "# Hello\n\nWorld";
    const file: FilePart = {
      type: "file",
      data: toBase64(content),
      mediaType: "text/markdown",
      filename: "readme.md",
    };
    const result = await resolver.resolve([file]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect((result[0] as TextPart).text).toContain(content);
    expect((result[0] as TextPart).text).toContain("readme.md");
  });

  test("extracts text/csv to TextPart", async () => {
    const content = "name,age\nAlice,30\nBob,25";
    const file: FilePart = {
      type: "file",
      data: toBase64(content),
      mediaType: "text/csv",
      filename: "data.csv",
    };
    const result = await resolver.resolve([file]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect((result[0] as TextPart).text).toContain(content);
  });

  test("extracts application/json to TextPart", async () => {
    const content = '{"key": "value"}';
    const file: FilePart = {
      type: "file",
      data: toBase64(content),
      mediaType: "application/json",
      filename: "config.json",
    };
    const result = await resolver.resolve([file]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect((result[0] as TextPart).text).toContain(content);
  });

  test("extracts text/html to TextPart", async () => {
    const content = "<h1>Hello</h1>";
    const file: FilePart = {
      type: "file",
      data: toBase64(content),
      mediaType: "text/html",
      filename: "page.html",
    };
    const result = await resolver.resolve([file]);
    expect(result[0].type).toBe("text");
    expect((result[0] as TextPart).text).toContain(content);
  });

  // ==================== Unsupported ====================

  test("throws UnsupportedMediaTypeError for unknown type", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("binary stuff"),
      mediaType: "application/octet-stream",
      filename: "data.bin",
    };
    expect(resolver.resolve([file])).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
  });

  test("throws UnsupportedMediaTypeError for docx", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("fake docx"),
      mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: "report.docx",
    };
    expect(resolver.resolve([file])).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
  });

  test("error message includes filename and mediaType", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("data"),
      mediaType: "application/zip",
      filename: "archive.zip",
    };
    try {
      await resolver.resolve([file]);
      expect(true).toBe(false); // should not reach
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedMediaTypeError);
      const err = e as UnsupportedMediaTypeError;
      expect(err.message).toContain("archive.zip");
      expect(err.message).toContain("application/zip");
      expect(err.mediaType).toBe("application/zip");
      expect(err.filename).toBe("archive.zip");
    }
  });

  // ==================== Mixed Content ====================

  test("resolves mixed content correctly", async () => {
    const parts: UserContentPart[] = [
      { type: "text", text: "Please analyze these files:" },
      {
        type: "file",
        data: toBase64("# README"),
        mediaType: "text/markdown",
        filename: "readme.md",
      },
      {
        type: "file",
        data: toBase64("fake image"),
        mediaType: "image/png",
        filename: "screenshot.png",
      },
      {
        type: "file",
        data: toBase64("fake pdf"),
        mediaType: "application/pdf",
        filename: "doc.pdf",
      },
    ];

    const result = await resolver.resolve(parts);
    expect(result).toHaveLength(4);

    // Text part unchanged
    expect(result[0].type).toBe("text");
    expect((result[0] as TextPart).text).toBe("Please analyze these files:");

    // Markdown → extracted to TextPart
    expect(result[1].type).toBe("text");
    expect((result[1] as TextPart).text).toContain("# README");

    // Image → passthrough FilePart
    expect(result[2].type).toBe("file");
    expect((result[2] as FilePart).mediaType).toBe("image/png");

    // PDF → passthrough FilePart
    expect(result[3].type).toBe("file");
    expect((result[3] as FilePart).mediaType).toBe("application/pdf");
  });

  // ==================== Edge Cases ====================

  test("handles data URL format", async () => {
    const content = "hello world";
    const dataUrl = `data:text/markdown;base64,${toBase64(content)}`;
    const file: FilePart = {
      type: "file",
      data: dataUrl,
      mediaType: "text/markdown",
      filename: "test.md",
    };
    const result = await resolver.resolve([file]);
    expect((result[0] as TextPart).text).toContain(content);
  });

  test("uses mediaType as label when filename is missing", async () => {
    const file: FilePart = {
      type: "file",
      data: toBase64("some json"),
      mediaType: "application/json",
    };
    const result = await resolver.resolve([file]);
    expect((result[0] as TextPart).text).toContain("application/json");
  });

  test("handles empty content array", async () => {
    const result = await resolver.resolve([]);
    expect(result).toEqual([]);
  });

  test("handles image/* wildcard matching", async () => {
    for (const mediaType of [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]) {
      const file: FilePart = {
        type: "file",
        data: toBase64("fake"),
        mediaType: mediaType as FilePart["mediaType"],
      };
      const result = await resolver.resolve([file]);
      expect(result[0].type).toBe("file");
    }
  });
});
