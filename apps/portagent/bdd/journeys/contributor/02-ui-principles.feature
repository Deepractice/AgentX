@journey @contributor
Feature: UI Development Principles
  As a contributor, I follow consistent UI principles,
  so development is fast and the codebase stays maintainable.

  # ============================================================================
  # Core Principle: Don't Build, Compose
  # ============================================================================

  Scenario: Use shadcn/ui for standard UI components
    Given I need a UI component
    When the component is a standard UI element (button, input, dialog, etc.)
    Then I should use shadcn/ui
    And I should NOT build a custom component

  Scenario: Use ai-elements for AI interactions
    Given I need AI-related UI
    When the component involves chat, streaming, or message display
    Then I should use @ai-sdk/react (ai-elements)
    And I should NOT build custom chat components

  Scenario: Use Tailwind for layout and styling
    Given I need to style or layout components
    Then I should use Tailwind CSS utilities
    And I should NOT write custom CSS unless absolutely necessary

  # ============================================================================
  # Component Mapping
  # ============================================================================

  # Standard UI (shadcn/ui):
  #   - Button, Input, Textarea
  #   - Dialog, Sheet, Dropdown
  #   - Card, Avatar, Badge
  #   - Form, Label, Select
  #
  # AI Components (ai-elements):
  #   - useChat hook
  #   - Message components
  #   - Streaming text display
  #   - Prompt input with submit
  #
  # Layout (Tailwind):
  #   - Flexbox, Grid
  #   - Spacing, Sizing
  #   - Colors, Typography
