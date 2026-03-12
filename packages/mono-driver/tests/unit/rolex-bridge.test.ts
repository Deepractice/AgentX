import { beforeEach, describe, expect, it, mock } from "bun:test";
import { protocol } from "rolexjs";
import { RolexBridge } from "../../src/rolex-bridge";

// Minimal mock Platform — just enough for RolexBridge constructor (init tested separately)
function createMockPlatform() {
  return {
    repository: {},
  } as any;
}

describe("RolexBridge", () => {
  describe("getTools", () => {
    it("should convert all RoleX protocol tools to ToolDefinition[]", () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();

      expect(tools.length).toBe(protocol.tools.length);

      // Every tool should have name, description, parameters, execute
      for (const tool of tools) {
        expect(tool.name).toBeString();
        expect(tool.description).toBeString();
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe("object");
        expect(typeof tool.execute).toBe("function");
      }
    });

    it("should include all expected tool names", () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();
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

    it("should use detail() for tool descriptions, not placeholders", () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();

      const activateTool = tools.find((t) => t.name === "activate");
      expect(activateTool).toBeDefined();
      // detail("activate") returns a Gherkin Feature, should start with "Feature:"
      expect(activateTool!.description).toStartWith("Feature:");
    });

    it("should convert ParamDef types to JSON Schema correctly", () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();

      // activate has roleId: string, required
      const activate = tools.find((t) => t.name === "activate")!;
      expect(activate.parameters.properties.roleId).toBeDefined();
      expect((activate.parameters.properties.roleId as any).type).toBe("string");
      expect(activate.parameters.required).toContain("roleId");

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
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();
      const names = tools.map((t) => t.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });
  });

  describe("getRoleContext", () => {
    it("should return world instructions even without active role", async () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      // Skip initialize() — directly test getRoleContext without rolex instance
      // World instructions come from protocol.instructions which is static
      const context = await bridge.getRoleContext();
      expect(context).toContain(protocol.instructions);
    });
  });

  describe("tool execution without initialization", () => {
    it("should throw when executing tool without initialization", async () => {
      const bridge = new RolexBridge({ platform: createMockPlatform() });
      const tools = bridge.getTools();
      const activate = tools.find((t) => t.name === "activate")!;

      expect(activate.execute({ roleId: "test" })).rejects.toThrow("RoleX not initialized");
    });
  });
});
