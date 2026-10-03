import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { CryptoSpikeProvider } from "@/context/trading-context";
import { ThemeProvider } from "next-themes";

import { GlobalErrorBoundary } from "./components/error-boundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <CryptoSpikeProvider>
          <App />
        </CryptoSpikeProvider>
      </ThemeProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
);
