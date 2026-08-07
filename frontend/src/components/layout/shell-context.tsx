import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SIDEBAR_STORAGE_KEY = "atlas.sidebar.collapsed";

/** Below this width the sidebar becomes an off-canvas sheet. Matches Tailwind's `lg`. */
const MOBILE_BREAKPOINT = "(max-width: 1023px)";

interface ShellContextValue {
  /** Rail is collapsed to icons only. Desktop concept; ignored on mobile. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (next: boolean) => void;

  /** Off-canvas sidebar, mobile only. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (next: boolean) => void;

  /** Right-hand notification panel. Ships collapsed. */
  notificationsOpen: boolean;
  toggleNotifications: () => void;
  setNotificationsOpen: (next: boolean) => void;

  isMobile: boolean;
}

const ShellContext = createContext<ShellContextValue | undefined>(undefined);

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    // Safari private mode throws on localStorage access.
    return false;
  }
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setCollapsedState] = useState(readStoredCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      // Leaving mobile with the sheet open would otherwise strand an overlay
      // over the desktop layout.
      if (!event.matches) setMobileNavOpen(false);
    };
    mq.addEventListener("change", onChange);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setSidebarCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // Non-fatal: the choice holds for this session, it just won't persist.
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // as above
      }
      return next;
    });
  }, []);

  const toggleNotifications = useCallback(() => setNotificationsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      notificationsOpen,
      toggleNotifications,
      setNotificationsOpen,
      isMobile,
    }),
    [
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      mobileNavOpen,
      notificationsOpen,
      toggleNotifications,
      isMobile,
    ],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within a ShellProvider");
  return ctx;
}
