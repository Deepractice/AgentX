/**
 * Theme Provider - Terminal color theming
 */

import { createContext, createMemo, type ParentProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";

/**
 * Theme colors
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: string;
  textMuted: string;
  background: string;
  backgroundPanel: string;
  backgroundElement: string;
  border: string;
  borderActive: string;
}

/**
 * Built-in themes
 */
const THEMES: Record<string, ThemeColors> = {
  opencode: {
    primary: "#fab283",
    secondary: "#c4a7e7",
    accent: "#fab283",
    error: "#eb6f92",
    warning: "#f6c177",
    success: "#9ccfd8",
    info: "#31748f",
    text: "#e0def4",
    textMuted: "#6e6a86",
    background: "#0a0a0a",
    backgroundPanel: "#1a1a1a",
    backgroundElement: "#2a2a2a",
    border: "#3a3a3a",
    borderActive: "#fab283",
  },
  dracula: {
    primary: "#bd93f9",
    secondary: "#ff79c6",
    accent: "#8be9fd",
    error: "#ff5555",
    warning: "#ffb86c",
    success: "#50fa7b",
    info: "#8be9fd",
    text: "#f8f8f2",
    textMuted: "#6272a4",
    background: "#282a36",
    backgroundPanel: "#1e1f29",
    backgroundElement: "#44475a",
    border: "#44475a",
    borderActive: "#bd93f9",
  },
  nord: {
    primary: "#88c0d0",
    secondary: "#81a1c1",
    accent: "#8fbcbb",
    error: "#bf616a",
    warning: "#ebcb8b",
    success: "#a3be8c",
    info: "#5e81ac",
    text: "#eceff4",
    textMuted: "#4c566a",
    background: "#2e3440",
    backgroundPanel: "#3b4252",
    backgroundElement: "#434c5e",
    border: "#4c566a",
    borderActive: "#88c0d0",
  },
  tokyonight: {
    primary: "#7aa2f7",
    secondary: "#bb9af7",
    accent: "#7dcfff",
    error: "#f7768e",
    warning: "#e0af68",
    success: "#9ece6a",
    info: "#2ac3de",
    text: "#c0caf5",
    textMuted: "#565f89",
    background: "#1a1b26",
    backgroundPanel: "#24283b",
    backgroundElement: "#414868",
    border: "#414868",
    borderActive: "#7aa2f7",
  },
};

interface ThemeContext {
  theme: () => ThemeColors;
  themeName: () => string;
  setTheme: (name: string) => void;
  availableThemes: () => string[];
}

const ThemeCtx = createContext<ThemeContext>();

export function ThemeProvider(props: ParentProps<{ initialTheme?: string }>) {
  const [store, setStore] = createStore({
    active: props.initialTheme ?? "opencode",
  });

  const theme = createMemo(() => THEMES[store.active] ?? THEMES.opencode);

  const ctx: ThemeContext = {
    theme,
    themeName: () => store.active,
    setTheme: (name: string) => {
      if (THEMES[name]) {
        setStore("active", name);
      }
    },
    availableThemes: () => Object.keys(THEMES),
  };

  return <ThemeCtx.Provider value={ctx}>{props.children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeContext {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
