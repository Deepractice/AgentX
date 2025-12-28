/**
 * Portagent Tailwind Configuration
 *
 * Uses @agentxjs/ui preset for consistent design system
 */
import agentxPreset from "@agentxjs/ui/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [agentxPreset],
  content: [
    "./index.html",
    "./src/client/**/*.{ts,tsx}",
    "../../node_modules/@agentxjs/ui/dist/**/*.js",
  ],
};
