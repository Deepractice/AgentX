/**
 * RoleX Bridge — integrates RoleX into MonoDriver
 *
 * Responsibilities:
 *   1. Convert RoleX ToolDef[] → AgentX ToolDefinition[]
 *   2. Manage RoleX instance lifecycle (create, activate)
 *   3. Provide Role Context projection for the three-layer context model
 *   4. Route tool calls to the active Role or RoleX builder
 *
 * Three-layer context model:
 *   Layer 1: System Prompt (fixed, from Image config)
 *   Layer 2: Role Context (dynamic, RoleX projection refreshed each turn)
 *   Layer 3: Message Context (conversation history, managed by Driver)
 */

import type { ToolDefinition } from "@agentxjs/core/driver";
import { createLogger } from "commonxjs/logger";
import type { ParamDef, Platform, Role, RoleXBuilder, ToolDef } from "rolexjs";
import { createRoleX } from "rolexjs";

const logger = createLogger("mono-driver/rolex-bridge");

/**
 * RoleX bridge configuration
 */
export interface RolexBridgeConfig {
  /** RoleX Platform instance (e.g. from localPlatform()) */
  platform: Platform;
  /** Role ID to auto-activate on initialize */
  roleId: string;
}

/**
 * RoleX Bridge — manages RoleX lifecycle and tool integration for MonoDriver
 */
export class RolexBridge {
  private rx: RoleXBuilder | null = null;
  private role: Role | null = null;
  private readonly platform: Platform;
  private readonly roleId: string;

  constructor(config: RolexBridgeConfig) {
    this.platform = config.platform;
    this.roleId = config.roleId;
  }

  /**
   * Initialize the RoleX builder and auto-activate the configured role
   */
  async initialize(): Promise<void> {
    this.rx = createRoleX({ platform: this.platform });
    this.role = await this.rx.individual.activate({ individual: this.roleId });
    logger.info("RoleX bridge initialized", { roleId: this.roleId });
  }

  /**
   * Build the complete Role Context (Layer 2 of the three-layer model).
   *
   * Composed of:
   *   - World Instructions: cognitive framework for AI roles
   *   - Role State Projection: active role's state tree (if activated)
   *
   * Always returns content when RoleX is enabled (world instructions are always present).
   */
  async getRoleContext(): Promise<string> {
    if (!this.rx) {
      throw new Error("RoleX not initialized");
    }

    const parts: string[] = [];

    // World instructions — always present
    parts.push(this.rx.protocol.instructions);

    // Role state projection — only when a role is activated
    if (this.role) {
      const projection = await this.role.project();
      parts.push(projection);
    }

    return parts.join("\n\n");
  }

  /**
   * Convert all RoleX tools to AgentX ToolDefinition[]
   */
  getTools(): ToolDefinition[] {
    if (!this.rx) {
      throw new Error("RoleX not initialized");
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
   * Execute a RoleX tool call, routing to the appropriate method
   */
  private async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.rx) {
      throw new Error("RoleX not initialized");
    }

    // Tools that work without an active role
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
        const cmdArgs = args.args as Record<string, unknown> | undefined;
        // Strip "!" prefix if present, then dispatch via JSON-RPC
        const method = command.startsWith("!") ? command.slice(1) : command;
        const response = await this.rx.rpc({
          jsonrpc: "2.0",
          method,
          params: cmdArgs,
          id: 1,
        });
        if (response.error) {
          throw new Error(response.error.message);
        }
        return response.result;
      }
    }

    // Tools that require an active role
    if (!this.role) {
      throw new Error("No role activated. Call activate first.");
    }

    switch (name) {
      case "focus":
        return this.role.focus(args.id as string | undefined);
      case "want":
        return this.role.want(args.goal as string, args.id as string);
      case "plan":
        return this.role.plan(
          args.plan as string,
          args.id as string,
          args.after as string | undefined,
          args.fallback as string | undefined
        );
      case "todo":
        return this.role.todo(args.task as string, args.id as string);
      case "finish":
        return this.role.finish(args.id as string, args.encounter as string | undefined);
      case "complete":
        return this.role.complete(
          args.id as string | undefined,
          args.encounter as string | undefined
        );
      case "abandon":
        return this.role.abandon(
          args.id as string | undefined,
          args.encounter as string | undefined
        );
      case "reflect":
        return this.role.reflect(
          args.ids as string[],
          args.experience as string | undefined,
          args.id as string
        );
      case "realize":
        return this.role.realize(
          args.ids as string[],
          args.principle as string | undefined,
          args.id as string
        );
      case "master":
        return this.role.master(
          args.procedure as string,
          args.id as string,
          args.ids as string[] | undefined
        );
      case "forget":
        return this.role.forget(args.id as string);
      case "skill":
        return this.role.skill(args.locator as string);
      case "use":
        return this.role.use(args.command as string, args.args as Record<string, unknown>);
      default:
        throw new Error(`Unknown RoleX tool: ${name}`);
    }
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
 * Create a RoleX bridge instance
 */
export function createRolexBridge(config: RolexBridgeConfig): RolexBridge {
  return new RolexBridge(config);
}
