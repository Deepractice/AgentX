import agentxPreset from "@agentxjs/ui/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [agentxPreset],
  content: [
    "./stories/**/*.{ts,tsx}",
    "../../packages/ui/dist/**/*.js",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
