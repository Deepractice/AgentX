import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Import agentx-ui styles (if built CSS exists)
// In development, Tailwind will process agentx-ui source directly
// In production, import the built CSS
if (import.meta.env.PROD) {
  try {
    // @ts-ignore - CSS import
    await import("@deepractice-ai/agentx-ui/styles.css");
  } catch (e) {
    console.warn("agentx-ui styles not found, using inline styles");
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
