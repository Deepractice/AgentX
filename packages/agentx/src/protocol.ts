/**
 * AgentX RPC Protocol — exported for ServiceX integration.
 *
 * This is the single source of truth for all RPC methods AgentX provides.
 * Closed-source services import this protocol to register AgentX methods.
 */

import type { RpcProtocol } from "@deepracticex/rpc";

export const protocol: RpcProtocol = {
  namespace: "runtime",
  version: "2.9.0",
  methods: [
    // Image
    { name: "image.create", description: "Create a new agent image" },
    { name: "image.get", description: "Get an agent image by ID" },
    { name: "image.list", description: "List all agent images" },
    { name: "image.delete", description: "Delete an agent image" },
    { name: "image.run", description: "Start an agent from an image" },
    { name: "image.stop", description: "Stop a running agent by image ID" },
    { name: "image.update", description: "Update an agent image configuration" },
    { name: "image.messages", description: "Get all messages for an agent image" },

    // Instance
    { name: "instance.get", description: "Get a running agent instance" },
    { name: "instance.list", description: "List all running agent instances" },
    { name: "instance.destroy", description: "Destroy a running agent instance" },
    { name: "instance.destroyAll", description: "Destroy all agent instances in a container" },
    { name: "instance.interrupt", description: "Interrupt an agent's current operation" },

    // Message
    { name: "message.send", description: "Send a message to an agent" },

    // Runtime
    { name: "runtime.rewind", description: "Rewind conversation to a specific message" },

    // LLM
    { name: "llm.create", description: "Create a new LLM provider configuration" },
    { name: "llm.get", description: "Get an LLM provider by ID" },
    { name: "llm.list", description: "List all LLM providers" },
    { name: "llm.update", description: "Update an LLM provider configuration" },
    { name: "llm.delete", description: "Delete an LLM provider" },
    { name: "llm.default", description: "Get or set the default LLM provider" },

    // OS/Workspace
    { name: "os.read", description: "Read a file from the agent's OS" },
    { name: "os.list", description: "List files in the agent's OS directory" },
    { name: "os.write", description: "Write content to a file in the agent's OS" },
  ],
};
