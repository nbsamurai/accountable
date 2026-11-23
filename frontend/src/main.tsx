import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { startTheme } from "./lib/theme";
import "./styles/global.css";

// Before the first render, so a dark choice never flashes light. System then follows the
// device's setting for as long as the page is open.
startTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
