import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ALL_NAV_ITEMS } from "./components/navigation/nav-config";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardPage from "./pages/dashboard";
import PlaceholderPage from "./pages/Placeholder";
import LegacyPicks from "./pages/Dashboard";
import Settings from "./pages/Settings";

/**
 * Every sidebar destination that has no page of its own yet resolves to
 * PlaceholderPage, so navigation is walkable end to end and adding a real page
 * is a one-line swap rather than a routing change.
 */
const PLACEHOLDER_ROUTES = ALL_NAV_ITEMS.filter((item) => item.soon).map((item) => item.to);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {PLACEHOLDER_ROUTES.map((path) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <PlaceholderPage />
                  </ProtectedRoute>
                }
              />
            ))}

            {/* The pre-shell picks list. Still functional and still reachable;
                it brings its own Navbar, so it is not wrapped in AppShell. */}
            <Route
              path="/picks"
              element={
                <ProtectedRoute>
                  <LegacyPicks />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
