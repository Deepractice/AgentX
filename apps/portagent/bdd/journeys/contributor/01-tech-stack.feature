@journey @contributor
Feature: Tech Stack Setup
  As a contributor, I need the right tech stack configured,
  so I can build the chat UI with Next.js + Hono.

  Scenario: Next.js is configured
    Given the portagent project
    Then package.json should have "next" dependency
    And "app/layout.tsx" should exist
    And "app/page.tsx" should exist

  Scenario: Hono API routes are configured
    Given the portagent project
    Then package.json should have "hono" dependency
    And "app/api/[...route]/route.ts" should exist

  Scenario: Tailwind is configured
    Given the portagent project
    Then package.json should have "tailwindcss" devDependency
    And "app/globals.css" should exist

  Scenario: AgentX SDK is available
    Given the portagent project
    Then package.json should have "agentxjs" dependency
