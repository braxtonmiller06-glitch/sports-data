import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AccessProvider } from "./lib/access";
import { TrackedPropsProvider } from "./lib/tracked-props";
import { SavedResearchProvider } from "./lib/saved-research";
import { SportProvider } from "./lib/sport-context";
import { AppRoutes } from "./AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Access, tracking and saved research sit above the router so any page
            can read them at its top level, not only components inside AppShell. */}
        <AccessProvider>
          <TrackedPropsProvider>
            <SavedResearchProvider>
              <SportProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </SportProvider>
            </SavedResearchProvider>
          </TrackedPropsProvider>
        </AccessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
