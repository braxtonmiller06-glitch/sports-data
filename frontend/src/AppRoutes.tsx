import type { ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ALL_NAV_ITEMS } from "./components/navigation/nav-config";
import { ROUTES, ROUTE_REDIRECTS } from "./lib/routes";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardPage from "./pages/dashboard";
import PlaceholderPage from "./pages/Placeholder";
import NotFoundPage from "./pages/NotFound";
import LegacyPicks from "./pages/Dashboard";
import Settings from "./pages/Settings";

// --- The eight tools ---------------------------------------------------------
import FilterPlaysPage from "./pages/tools/FilterPlays";
import LivePlaysPage from "./pages/tools/LivePlays";
import StraightDataPage from "./pages/tools/StraightData";
import HotColdPage from "./pages/tools/HotCold";
import MorningBriefingPage from "./pages/tools/MorningBriefingTool";
import PlayerBoardPage from "./pages/tools/PlayerBoard";
import HeadToHeadPage from "./pages/tools/HeadToHead";
import AskAtlasPage from "./pages/tools/AskAtlasTool";

const TOOL_ROUTES: { path: string; element: ReactNode }[] = [
  { path: ROUTES.filterPlays, element: <FilterPlaysPage /> },
  { path: ROUTES.livePlays, element: <LivePlaysPage /> },
  { path: ROUTES.straightData, element: <StraightDataPage /> },
  { path: ROUTES.hotCold, element: <HotColdPage /> },
  { path: ROUTES.morningBriefing, element: <MorningBriefingPage /> },
  { path: ROUTES.playerBoard, element: <PlayerBoardPage /> },
  { path: ROUTES.headToHead, element: <HeadToHeadPage /> },
  { path: ROUTES.askAtlas, element: <AskAtlasPage /> },
];

const TOOL_PATHS = new Set<string>(TOOL_ROUTES.map((route) => route.path));

/**
 * Nav destinations that have no page of their own yet. Tools are excluded —
 * they all have real workspaces — so this only covers the sections still to be
 * built.
 */
const PLACEHOLDER_ROUTES = ALL_NAV_ITEMS.filter(
  (item) => item.soon && !TOOL_PATHS.has(item.to),
).map((item) => item.to);

/**
 * The application's route table, shared by the live app and the review
 * snapshot.
 *
 * It lives here rather than inside App so the snapshot renders the *same*
 * routes. When the snapshot rendered a single page instead, every link
 * navigated an in-memory history that nothing was listening to, and the whole
 * shared build looked frozen — links appeared dead because no route existed to
 * render the destination.
 *
 * `guarded` is off in the snapshot, which has no session to check.
 */
export function AppRoutes({ guarded = true }: { guarded?: boolean }) {
  const guard = (element: ReactNode) =>
    guarded ? <ProtectedRoute>{element}</ProtectedRoute> : <>{element}</>;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path={ROUTES.login} element={<Login />} />
      <Route path={ROUTES.signup} element={<Signup />} />

      <Route path={ROUTES.dashboard} element={guard(<DashboardPage />)} />

      {TOOL_ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={guard(route.element)} />
      ))}

      {PLACEHOLDER_ROUTES.map((path) => (
        <Route key={path} path={path} element={guard(<PlaceholderPage />)} />
      ))}

      {/* Paths that moved when tools were namespaced. */}
      {Object.entries(ROUTE_REDIRECTS).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}

      {/* The pre-shell picks list. Still functional and still reachable;
          it brings its own Navbar, so it is not wrapped in AppShell. */}
      <Route path="/picks" element={guard(<LegacyPicks />)} />

      <Route path={ROUTES.settings} element={guard(<Settings />)} />

      {/* Catch-all, so a stale or mistyped link lands somewhere recoverable
          rather than on a blank screen. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
