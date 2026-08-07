import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AccessProvider } from "./lib/access";
import { TrackedPropsProvider } from "./lib/tracked-props";
import { AppRoutes } from "./AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Access and tracking sit above the router so any page can read them
            at its top level, not only components inside AppShell. */}
        <AccessProvider>
          <TrackedPropsProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TrackedPropsProvider>
        </AccessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
