import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "./index.css";
import { ThemeProvider, THEME_STORAGE_KEY } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import DashboardPage from "./pages/dashboard";

/**
 * Static snapshot entry point.
 *
 * Builds the real dashboard into a single self-contained page for review and
 * sharing. It is the same components the app renders — not a mockup — with two
 * differences forced for the standalone context:
 *
 *  - MemoryRouter, because the page is served from an arbitrary path with no
 *    server-side routing behind it.
 *  - The auth guard is skipped: there is no session here, and the dashboard
 *    reads only fixture data anyway.
 *
 * This is a review artifact. It is not part of the application bundle.
 */

// The host page decides light/dark, but this snapshot exists to show the
// terminal aesthetic, so pin it before React reads the stored preference.
try {
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
} catch {
  // Private mode: the attribute below still carries it for this render.
}
document.documentElement.setAttribute("data-theme", "dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <DashboardPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
