/**
 * RolexContext — RoleX implementation of the Context interface
 *
 * Provides:
 *   1. Role Context projection (Layer 2 of the three-layer context model)
 *   2. RoleX tool conversion (ToolDef[] → ToolDefinition[])
 *   3. RoleX instance lifecycle management
 *   4. Tool call routing to the active Role or RoleX builder
 *
 * Usage:
 *   const ctx = new RolexContext({ platform, roleId: "nuwa" });
 *   await ctx.initialize();
 *
 *   // As Context — pass to any Driver via DriverConfig.context
 *   createMonoDriver({ context: ctx, tools: ctx.getTools(), ... });
 *
 *   // Context projection (called each turn by Driver)
 *   const content = await ctx.project();
 */

import { createLogger } from "commonxjs/logger";
import type { ParamDef, Platform, Role, RoleXBuilder, ToolDef } from "rolexjs";
import { createRoleX, toArgs } from "rolexjs";
import type { ToolDefinition } from "../driver/types";
import type { Context } from "./types";

const logger = createLogger("core/rolex-context");

/**
 * RolexContext configuration
 */
export interface RolexContextConfig {
  /** RoleX Platform instance (e.g. from localPlatform()) */
  platform: Platform;
  /** Role ID to auto-activate on initialize */
  roleId: string;
}

/**
 * RolexContext — implements Context and provides RoleX tools for AgentX
 */
export class RolexContext implements Context {
  private rx: RoleXBuilder | null = null;
  private role: Role | null = null;
  private readonly platform: Platform;
  private readonly roleId: string;

  constructor(config: RolexContextConfig) {
    this.platform = config.platform;
    this.roleId = config.roleId;
  }

  /**
   * Initialize the RoleX builder and auto-activate the configured role
   */
  async initialize(): Promise<void> {
    this.rx = createRoleX({ platform: this.platform });
    this.role = await this.rx.individual.activate({ individual: this.roleId });
    logger.info("RolexContext initialized", { roleId: this.roleId });
  }

  // ============================================================================
  // Context Interface
  // ============================================================================

  /**
   * World-level instructions — the cognitive framework for AI roles.
   */
  get instructions(): string {
    if (!this.rx) {
      throw new Error("RolexContext not initialized");
    }
    return this.rx.protocol.instructions;
  }

  /**
   * Project the current cognitive state (refreshed each turn).
   *
   * Returns the active role's state tree — identity, goals, plans, knowledge, etc.
   */
  async project(): Promise<string> {
    if (!this.rx) {
      throw new Error("RolexContext not initialized");
    }

    if (this.role) {
      return this.role.project();
    }

    return "";
  }

  // ============================================================================
  // Tool Provider
  // ============================================================================

  /**
   * Convert all RoleX tools to AgentX ToolDefinition[]
   *
   * Called by the runtime to collect tools before passing to Driver.
   */
  getTools(): ToolDefinition[] {
    if (!this.rx) {
      throw new Error("RolexContext not initialized");
    }
    return this.rx.protocol.tools.map((toolDef) => this.convertTool(toolDef));
  }

  /**
   * Convert a single RoleX ToolDef to AgentX ToolDefinition
   */
  private convertTool(toolDef: ToolDef): ToolDefinition {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [name, param] of Object.entries(toolDef.params)) {
      properties[name] = paramToJsonSchema(param);
      if (param.required) {
        required.push(name);
      }
    }

    return {
      name: toolDef.name,
      description: toolDef.description,
      parameters: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
      execute: async (input: Record<string, unknown>) => {
        return this.executeTool(toolDef.name, input);
      },
    };
  }

  /**
   * Execute a RoleX tool call.
   *
   * Builder-level tools (activate, inspect, survey, direct) are handled directly.
   * Role-level tools are dispatched dynamically via toArgs() from the RoleX instruction schema.
   */
  private async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.rx) {
      throw new Error("RolexContext not initialized");
    }

    // Builder-level tools — work without an active role
    switch (name) {
      case "activate": {
        const roleId = args.roleId as string;
        this.role = await this.rx.individual.activate({ individual: roleId });
        logger.info("Role activated", { roleId });
        return this.role.project();
      }
      case "inspect":
        return this.rx.inspect({ id: args.id as string });
      case "survey":
        return this.rx.survey({ type: args.type as string | undefined });
      case "direct": {
        const command = args.command as string;
        const method = command.startsWith("!") ? command.slice(1) : command;
        const response = await this.rx.rpc({
          jsonrpc: "2.0",
          method,
          params: args.args as Record<string, unknown> | undefined,
          id: 1,
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.result;
      }
    }

    // Role-level tools — dispatch via instruction schema
    if (!this.role) {
      throw new Error("No role activated. Call activate first.");
    }

    const fn = (this.role as unknown as Record<string, Function>)[name];
    if (typeof fn !== "function") {
      throw new Error(`Unknown RoleX tool: ${name}`);
    }

    return fn.apply(this.role, toArgs(`role.${name}`, args));
  }
}

/**
 * Convert RoleX ParamDef to JSON Schema property
 */
function paramToJsonSchema(param: ParamDef): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    description: param.description,
  };

  switch (param.type) {
    case "string":
    case "gherkin":
      schema.type = "string";
      break;
    case "number":
      schema.type = "number";
      break;
    case "string[]":
      schema.type = "array";
      schema.items = { type: "string" };
      break;
    case "record":
      schema.type = "object";
      break;
  }

  return schema;
}

/**
 * Create a RolexContext instance
 */
export function createRolexContext(config: RolexContextConfig): RolexContext {
  return new RolexContext(config);
}
