/**
 * RoleX Context Structure Test
 *
 * Verifies the three-layer context model using real RoleX localPlatform.
 * Tests that Role Context (Layer 2) contains:
 *   - World Instructions (RoleX cognitive framework)
 *   - Role State Projection (active role's state tree)
 */

import { describe, expect, it } from "bun:test";
import { localPlatform } from "@rolexjs/local-platform";
import { protocol } from "rolexjs";
import { RolexBridge } from "../../src/rolex-bridge";

describe("RoleX Context Structure", () => {
  const platform = localPlatform(); // ~/.deepractice/rolex

  it("getRoleContext contains world instructions", async () => {
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const context = await bridge.getRoleContext();

    // Should contain world instructions
    expect(context).toContain(protocol.instructions);
    expect(context.length).toBeGreaterThan(protocol.instructions.length);
  });

  it("getRoleContext contains role state projection", async () => {
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const context = await bridge.getRoleContext();

    // Role projection should contain the role name/id
    expect(context).toContain("nuwa");
  });

  it("world instructions and role projection are separate sections", async () => {
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const context = await bridge.getRoleContext();

    // They are joined by \n\n
    const parts = context.split(protocol.instructions);
    expect(parts.length).toBe(2);
    // Part after instructions should contain role projection
    expect(parts[1].trim().length).toBeGreaterThan(0);
  });

  it("MonoDriver wraps context in <role-context> tags", async () => {
    // Test the buildSystemPrompt logic by simulating what MonoDriver does
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const roleContext = await bridge.getRoleContext();

    // Simulate MonoDriver.buildSystemPrompt()
    const systemPrompt = "You are a helpful assistant.";
    const fullPrompt = `${systemPrompt}\n\n<role-context>\n${roleContext}\n</role-context>`;

    // Layer 1: system prompt
    expect(fullPrompt).toContain(systemPrompt);

    // Layer 2: role-context tags
    expect(fullPrompt).toContain("<role-context>");
    expect(fullPrompt).toContain("</role-context>");

    // World instructions inside role-context
    const roleContextBlock = fullPrompt.match(/<role-context>([\s\S]*)<\/role-context>/)?.[1];
    expect(roleContextBlock).toBeDefined();
    expect(roleContextBlock).toContain(protocol.instructions);

    // Role projection inside role-context
    expect(roleContextBlock).toContain("nuwa");
  });

  it("tools have descriptions from detail()", async () => {
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const tools = bridge.getTools();

    // Every tool should have a non-empty description
    for (const tool of tools) {
      expect(tool.description).toBeDefined();
      expect(tool.description!.length).toBeGreaterThan(0);
      // detail() returns Gherkin Feature text
      expect(tool.description).toContain("Feature:");
    }
  });

  it("all RoleX protocol tools are registered", async () => {
    const bridge = new RolexBridge({ platform, roleId: "nuwa" });
    await bridge.initialize();

    const tools = bridge.getTools();
    const toolNames = tools.map((t) => t.name);

    // Core tools
    expect(toolNames).toContain("activate");
    expect(toolNames).toContain("want");
    expect(toolNames).toContain("plan");
    expect(toolNames).toContain("todo");
    expect(toolNames).toContain("finish");
    expect(toolNames).toContain("reflect");
    expect(toolNames).toContain("realize");
    expect(toolNames).toContain("master");
    expect(toolNames).toContain("inspect");
    expect(toolNames).toContain("survey");
    expect(toolNames).toContain("use");
  });
});
