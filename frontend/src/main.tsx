import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { CryptoSpikeProvider } from "@/context/trading-context";

import { GlobalErrorBoundary } from "./components/error-boundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <CryptoSpikeProvider>
        <App />
      </CryptoSpikeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
