@journey @developer
Feature: Error Handling in AgentX SDK
  As a developer, I need structured error handling so I can respond to
  failures gracefully without digging into stream events.

  # ============================================================================
  # AgentXError — Top-Level Error Type
  # ============================================================================

  Scenario: Developer understands AgentXError as a core type
    Given AgentXError is defined in @agentxjs/core/error
    Then it is a top-level type like AgentXPlatform
    And it extends the standard Error class
    And it has these properties:
      | property    | type                                          | description              |
      | code        | string                                        | e.g. "PERSISTENCE_FAILED"|
      | category    | "driver" \| "persistence" \| "connection" \| "runtime" | which layer failed       |
      | recoverable | boolean                                       | should the caller retry  |
      | context     | { instanceId?, sessionId?, messageId? }          | scope of the error       |
      | cause       | Error (optional)                              | original error           |

  Scenario: Developer imports AgentXError from core
    Given I need to handle errors
    When I import from @agentxjs/core/error:
      """
      import { AgentXError } from "@agentxjs/core/error";
      """
    Then I can use AgentXError for instanceof checks and error creation

  # ============================================================================
  # onError — Top-Level API
  # ============================================================================

  Scenario: Developer subscribes to errors via onError
    Given I have an AgentX instance in any mode
    When I register an error handler:
      """
      ax.onError((error) => {
        console.error(`[${error.category}] ${error.code}: ${error.message}`);
        if (!error.recoverable) {
          // Circuit is open, stop sending requests
        }
      });
      """
    Then all AgentXError instances from any layer are delivered to this handler
    And this is independent of ax.on("error", ...) which handles stream events
    And this is independent of presentation.onError which handles UI errors

  # ============================================================================
  # Circuit Breaker — Driver Layer
  # ============================================================================

  Scenario: Circuit breaker protects against cascading LLM failures
    Given the LLM API returns consecutive errors
    When the failure count reaches the threshold (default: 5)
    Then the circuit opens and rejects new requests immediately
    And an AgentXError is emitted:
      | code        | CIRCUIT_OPEN                          |
      | category    | driver                                |
      | recoverable | false                                 |
      | message     | Circuit breaker open: too many failures|

  Scenario: Circuit breaker recovers after cooldown
    Given the circuit is open
    When the reset timeout elapses (default: 30 seconds)
    Then the circuit transitions to half-open
    And the next request is allowed through as a probe
    And if it succeeds, the circuit closes and normal operation resumes
    And if it fails, the circuit re-opens

  # ============================================================================
  # Persistence Errors — No Longer Silent
  # ============================================================================

  Scenario: Persistence failure emits AgentXError instead of silent logging
    Given an agent is processing a conversation
    When a message fails to persist to the session repository
    Then an AgentXError is emitted via onError:
      | code        | PERSISTENCE_FAILED        |
      | category    | persistence               |
      | recoverable | true                      |
    And the conversation continues (persistence failure does not crash the agent)
    And the error includes context with instanceId and sessionId

  Scenario: User message persistence failure stops the request
    Given a user sends a message
    When the user message fails to persist
    Then the request fails with an error (not silently swallowed)
    And an AgentXError is emitted with code "PERSISTENCE_FAILED"
