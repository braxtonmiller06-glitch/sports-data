import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "./index.css";
import { ThemeProvider, THEME_STORAGE_KEY } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { AccessProvider } from "./lib/access";
import { TrackedPropsProvider } from "./lib/tracked-props";
import { SavedResearchProvider } from "./lib/saved-research";
import { SportProvider } from "./lib/sport-context";
import { AppRoutes } from "./AppRoutes";

/**
 * Static snapshot entry point.
 *
 * Builds the real application into a single self-contained page for review and
 * sharing. It renders the *same* route table as the live app — not a single
 * page — so every link in the sidebar, the Tools menu and the dashboard cards
 * navigates exactly as it does in the app.
 *
 * Two differences are forced by the standalone context:
 *
 *  - MemoryRouter, because the file is opened from an arbitrary path with no
 *    server behind it to resolve routes.
 *  - The auth guard is off: there is no session here, and every page reads
 *    fixtures anyway.
 */

// The host page decides light/dark, but this snapshot exists to show the
// terminal aesthetic, so pin it before React reads the stored preference.
try {
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
} catch {
  // Private mode: the attribute below still carries it for this render.
}
document.documentElement.setAttribute("data-theme", "dark");

// Expose the tier switcher in the review build so free/medium/elite can be
// compared from the shared link, not only from a dev server.
(globalThis as { __ATLAS_DEV_TOOLS__?: boolean }).__ATLAS_DEV_TOOLS__ = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <AccessProvider>
          <TrackedPropsProvider>
            <SavedResearchProvider>
              <SportProvider>
                <MemoryRouter initialEntries={["/dashboard"]}>
                  <AppRoutes guarded={false} />
                </MemoryRouter>
              </SportProvider>
            </SavedResearchProvider>
          </TrackedPropsProvider>
        </AccessProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
