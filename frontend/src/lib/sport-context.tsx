import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SPORT, sportById, type SportConfig, type SportId } from "./sports";

const STORAGE_KEY = "atlas.sport";

interface SportContextValue {
  sport: SportId;
  config: SportConfig;
  setSport: (id: SportId) => void;
}

const SportContext = createContext<SportContextValue | undefined>(undefined);

function readStored(): SportId {
  try {
    // sessionStorage, not localStorage: the choice is meant to persist for the
    // session, not to follow the user back weeks later.
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && ["nba", "nfl", "mlb", "wnba", "soccer"].includes(stored)) {
      return stored as SportId;
    }
  } catch {
    // Safari private mode throws on storage access.
  }
  return DEFAULT_SPORT;
}

/**
 * The app-wide sport scope.
 *
 * Lives above the router so the dashboard, the tools and Player Lookup all read
 * the same selection, and so changing it in the top bar is felt everywhere at
 * once rather than page by page.
 */
export function SportProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<SportId>(readStored);

  const setSport = useCallback((id: SportId) => {
    setSportState(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Non-fatal: the choice still holds for this page view.
    }
  }, []);

  const value = useMemo(
    () => ({ sport, config: sportById(sport), setSport }),
    [sport, setSport],
  );

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSport(): SportContextValue {
  const ctx = useContext(SportContext);
  if (!ctx) throw new Error("useSport must be used within a SportProvider");
  return ctx;
}
