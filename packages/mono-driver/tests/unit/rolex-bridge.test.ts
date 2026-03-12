import { describe, expect, it } from "bun:test";
import { RolexContext } from "@agentxjs/core/context";
import { protocol } from "rolexjs";

// Minimal mock Platform — just enough for RolexContext constructor
function createMockPlatform() {
  return {
    repository: {},
  } as any;
}

// Inject a mock rx builder so getTools()/project() work without real init
function createInitializedContext(): RolexContext {
  const ctx = new RolexContext({
    platform: createMockPlatform(),
    roleId: "test",
  });
  // Inject mock rx with protocol access
  (ctx as any).rx = { protocol };
  return ctx;
}

describe("RolexContext", () => {
  describe("getTools", () => {
    it("should convert all RoleX protocol tools to ToolDefinition[]", () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();

      expect(tools.length).toBe(protocol.tools.length);

      // Every tool should have name, description, parameters, execute
      for (const tool of tools) {
        expect(tool.name).toBeString();
        expect(tool.description).toBeString();
        expect(tool.description!.length).toBeGreaterThan(0);
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe("object");
        expect(typeof tool.execute).toBe("function");
      }
    });

    it("should include all expected tool names", () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();
      const names = tools.map((t) => t.name);

      // Core tools that must exist
      expect(names).toContain("activate");
      expect(names).toContain("want");
      expect(names).toContain("plan");
      expect(names).toContain("todo");
      expect(names).toContain("finish");
      expect(names).toContain("reflect");
      expect(names).toContain("realize");
      expect(names).toContain("master");
      expect(names).toContain("inspect");
      expect(names).toContain("survey");
      expect(names).toContain("use");
      expect(names).toContain("direct");
    });

    it("should use embedded description from ToolDef, not placeholders", () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();

      const activateTool = tools.find((t) => t.name === "activate");
      expect(activateTool).toBeDefined();
      // Description is embedded in ToolDef, should be a Gherkin Feature
      expect(activateTool!.description).toStartWith("Feature:");
    });

    it("should convert ParamDef types to JSON Schema correctly", () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();

      // reflect has ids: string[], required
      const reflect = tools.find((t) => t.name === "reflect")!;
      expect((reflect.parameters.properties.ids as any).type).toBe("array");
      expect((reflect.parameters.properties.ids as any).items.type).toBe("string");

      // use has args: record, optional
      const use = tools.find((t) => t.name === "use")!;
      expect((use.parameters.properties.args as any).type).toBe("object");
      const useRequired = use.parameters.required ?? [];
      expect(useRequired).not.toContain("args");
    });

    it("should not have name conflicts between RoleX tools", () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();
      const names = tools.map((t) => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("should throw when getTools called without initialization", () => {
      const ctx = new RolexContext({
        platform: createMockPlatform(),
        roleId: "test",
      });
      expect(() => ctx.getTools()).toThrow("RolexContext not initialized");
    });
  });

  describe("instructions", () => {
    it("should return world instructions from protocol", () => {
      const ctx = createInitializedContext();
      expect(ctx.instructions).toBe(protocol.instructions);
    });

    it("should throw when accessed without initialization", () => {
      const ctx = new RolexContext({
        platform: createMockPlatform(),
        roleId: "test",
      });
      expect(() => ctx.instructions).toThrow("RolexContext not initialized");
    });
  });

  describe("tool execution without initialization", () => {
    it("should throw when executing tool without active role", async () => {
      const ctx = createInitializedContext();
      const tools = ctx.getTools();
      const activate = tools.find((t) => t.name === "activate")!;

      // rx is set but not a real RoleXBuilder, so operations will fail
      expect(activate.execute({ roleId: "test" })).rejects.toThrow();
    });
  });
});
