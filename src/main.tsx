import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { startServerTimeSync } from "./lib/server-time.ts";
import "./styles/index.css";

// Measure the client clock against the server before the first paint so every
// persisted timestamp and every "days old" calculation is server-correct.
// Non-blocking: the app renders immediately with the last cached offset.
startServerTimeSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
