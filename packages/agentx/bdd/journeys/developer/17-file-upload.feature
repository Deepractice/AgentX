@journey @developer @file-upload
Feature: File Upload Support
  A developer sends files (text, markdown, JSON, PDF, images) to an agent.
  The MonoDriver should handle each type correctly:
  - Supported types are passed through to the LLM provider
  - Text-based types are extracted and sent as text content
  - Unsupported types produce a clear error message

  Scenario: Send a markdown file and get a response
    Given a local AgentX environment with provider "anthropic"
    When I create an image "File Reader" with prompt "You are a helpful assistant. When given file content, summarize it briefly in one sentence."
    And I run the image as an agent
    When I send a file "notes.md" with type "text/markdown" containing "# Project Plan\n\n- Phase 1: Design\n- Phase 2: Build\n- Phase 3: Test"
    Then I should receive a non-empty reply

  Scenario: Send a JSON file and get a response
    Given a local AgentX environment with provider "anthropic"
    When I create an image "JSON Reader" with prompt "You are a helpful assistant. When given file content, describe it briefly."
    And I run the image as an agent
    When I send a file "config.json" with type "application/json" containing "{name: agentx, version: 2.8.0}"
    Then I should receive a non-empty reply

  Scenario: Send a plain text file (passthrough)
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Text Reader" with prompt "You are a helpful assistant. Read the file and reply with a one-word summary."
    And I run the image as an agent
    When I send a file "readme.txt" with type "text/plain" containing "This is a simple readme file for the project."
    Then I should receive a non-empty reply

  Scenario: Send an unsupported file type and get an error
    Given a local AgentX environment with provider "anthropic"
    When I create an image "Binary Reader" with prompt "You are a helpful assistant."
    And I run the image as an agent
    When I send a file "data.bin" with type "application/octet-stream" containing "binary data"
    Then I should receive an unsupported media type error for "application/octet-stream"
