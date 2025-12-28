/**
 * Portagent Tailwind Configuration
 *
 * Uses @agentxjs/ui preset for consistent design system
 */
import agentxPreset from "../../packages/ui/tailwind-preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [agentxPreset],
  content: [
    // Portagent source files
    "./src/client/**/*.{ts,tsx}",
    // UI package components
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Portagent-specific customizations can go here
    },
  },
};
