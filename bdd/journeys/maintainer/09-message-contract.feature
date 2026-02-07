@journey @maintainer
Feature: Message Format Contract
  As a maintainer, I enforce the message conversion contract between layers,
  so tool results and conversation history are never corrupted across boundaries.

  # ============================================================================
  # Core Principle: AgentX Message is the canonical format
  # ============================================================================
  #
  #  Core Layer (Message types)     Driver Layer (Converters)     AI SDK (ModelMessage)
  #  ┌─────────────────────┐       ┌──────────────────────┐      ┌─────────────────┐
  #  │ UserMessage          │       │                      │      │ role: "user"     │
  #  │ AssistantMessage     │──────→│  toVercelMessage()   │─────→│ role: "assistant"│
  #  │ ToolResultMessage    │       │  toVercelMessages()  │      │ role: "tool"     │
  #  │ ErrorMessage         │       │                      │      │                  │
  #  └─────────────────────┘       └──────────────────────┘      └─────────────────┘
  #
  #  Rule: Converters MUST use Core types directly, never use `as unknown as`.
  #        Field names and structures must match the Core type definitions.
  #

  Scenario: ToolResultMessage converts to Vercel ToolModelMessage
    Given the core defines ToolResultMessage as:
      | field       | type            | source                    |
      | toolCallId  | string          | ID matching the tool call |
      | toolResult  | ToolResultPart  | { id, name, output }      |
    And ToolResultPart.output is a ToolResultOutput union:
      | type             | value type | when                      |
      | text             | string     | Normal text result        |
      | json             | unknown    | Structured JSON result    |
      | error-text       | string     | Error as text             |
      | error-json       | unknown    | Error as JSON             |
      | execution-denied | reason?    | User denied execution     |
    When the driver converts it to Vercel AI SDK format
    Then the Vercel ToolModelMessage must have:
      | field                  | mapped from               |
      | content[0].toolCallId  | message.toolCallId        |
      | content[0].toolName    | message.toolResult.name   |
      | content[0].output      | message.toolResult.output |
    And the output must preserve the ToolResultOutput discriminated union
    # Never flatten, stringify, or unwrap the output — pass it through as-is

  Scenario: AssistantMessage with tool calls converts correctly
    Given the core defines AssistantMessage.content as array containing ToolCallPart:
      | field | type                   |
      | id    | string (tool call ID)  |
      | name  | string (tool name)     |
      | input | Record<string, unknown>|
    When the driver converts it to Vercel AI SDK format
    Then each ToolCallPart must map to:
      | vercel field  | mapped from       |
      | toolCallId    | part.id           |
      | toolName      | part.name         |
      | input         | part.input        |

  Scenario: Converters use Core types, not ad-hoc casts
    Given a converter function in the driver layer
    Then it must import and use Core message types directly:
      | do                                          | don't                                            |
      | message as ToolResultMessage                | message as unknown as { toolResult: { result } } |
      | msg.toolResult.output                       | msg.toolResult.result                            |
      | msg.toolResult.name                         | "unknown"                                        |
    And type-safe access prevents silent undefined bugs

  Scenario: Tool result round-trips through session storage
    Given a tool executes and returns a result
    When the engine creates a ToolResultMessage via messageAssemblerProcessor
    Then the message is stored in the session repository
    And when the driver loads history for the next LLM call
    Then toVercelMessages() converts each stored message
    And the ToolResultOutput arrives at the AI SDK intact
    # The full cycle: tool_result event → ToolResultMessage → storage → load → toVercelMessage → AI SDK

  Scenario: Multi-step tool execution preserves correct message ordering
    # AI SDK multi-step: tool-call → tool-result → finish-step → start-step → text → finish
    # Engine must persist: Assistant(tool-calls) BEFORE ToolResult
    # Otherwise next turn gets AI_MissingToolResultsError
    Given a multi-step tool execution produces stream events in order:
      | event          | data                        |
      | start          |                             |
      | start-step     | step 1                      |
      | text-delta     | Let me check.               |
      | tool-call      | call-001, bash_tool, ls -la |
      | tool-result    | call-001, file listing      |
      | finish-step    | tool-calls                  |
      | start-step     | step 2                      |
      | text-delta     | Here are the files.         |
      | finish-step    | stop                        |
      | finish         | stop                        |
    When the driver translates these to engine events
    Then the engine events must include message_stop before tool_result
    And the resulting message sequence is:
      | order | type             | key content                |
      | 1     | AssistantMessage | text + tool-call(call-001) |
      | 2     | ToolResultMessage| toolCallId = call-001      |
      | 3     | AssistantMessage | Here are the files.        |
    # This ordering ensures AI SDK can match tool results to tool calls on next turn

  Scenario: Converted messages pass AI SDK Zod schema validation
    # The real guard: validate against AI SDK's actual runtime schema,
    # not just our assumed field names. This catches "args vs input" type bugs
    # that `as unknown as ModelMessage` would hide from TypeScript.
    Given a complete conversation with user, assistant (text+tool-calls), and tool results
    When each message is converted via toVercelMessage()
    Then every converted message must pass the AI SDK modelMessageSchema
    # If this test fails, the field names or structure don't match what the SDK expects

  Scenario: Full conversation with tool calls then follow-up text
    # Reproduces the exact flow: user → AI text → user → AI uses bash → user → Error
    # This is the 3-turn conversation that triggers AI_APICallError
    Given a session stores the following conversation history:
      | turn | role      | content                                  |
      | 1    | user      | 你好啊                                    |
      | 1    | assistant | 您好！我是您的AI助手。                     |
      | 2    | user      | 你用 bash 计算一下 2342342 + 675675       |
      | 2    | assistant | 好的，我来用bash帮您计算 [tool-call:bash]  |
      | 2    | tool      | 3018017                                  |
      | 2    | assistant | 计算结果是：3018017                       |
    When the driver loads history and prepares the next request with "确实不错"
    Then the full message array must pass AI SDK modelMessageSchema validation
    And the Anthropic provider must be able to convert all messages without error
