import "@jungle/design-tokens/tokens.css";
import "@jungle/kiosk-kit/kiosk.css";
import "./styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { watchErrors } from "@jungle/kiosk-kit";
import { App } from "./App";

// The panel's unexpected errors go to the backend on the same origin (ADR-0017).
watchErrors("admin", "/api/v1/client-errors");

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
