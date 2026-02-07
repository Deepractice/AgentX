@journey @devtools
Feature: VCR Recording Pipeline
  As a devtools maintainer, I verify that the VCR recording pipeline
  can successfully call the LLM provider and capture driver events.

  This feature diagnoses the recording chain:
  MonoDriver → @ai-sdk/anthropic → Deepractice Relay → LLM

  Scenario: MonoDriver can call Deepractice API and receive a response
    Given a MonoDriver configured with Deepractice API credentials
    When I send a simple message "Say hello in one word"
    Then the driver should emit a message_start event
    And the driver should emit at least one text_delta event
    And the driver should emit a message_stop event
    And there should be no error events

  Scenario: RecordingDriver captures events from a real API call
    Given a RecordingDriver wrapping a MonoDriver with Deepractice credentials
    When I send a simple message "Reply with just the word yes" via recorder
    Then the recording should contain a message_start event
    And the recording should contain at least one text_delta event
    And the recording should contain a message_stop event
    And the recorded fixture should be saveable to disk
