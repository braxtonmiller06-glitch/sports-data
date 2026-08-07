import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "atlas.trackedProps";

export interface TrackedProp {
  id: string;
  subject: string;
  market: string;
  addedAt: number;
}

interface TrackedPropsValue {
  tracked: TrackedProp[];
  isTracked: (id: string) => boolean;
  track: (prop: Omit<TrackedProp, "addedAt">) => void;
  untrack: (id: string) => void;
  toggle: (prop: Omit<TrackedProp, "addedAt">) => void;
}

const TrackedPropsContext = createContext<TrackedPropsValue | undefined>(undefined);

function readStored(): TrackedProp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Anything could be in localStorage; only keep entries with the shape we
    // expect rather than trusting it and rendering undefined into the UI.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TrackedProp =>
        !!item &&
        typeof item === "object" &&
        typeof (item as TrackedProp).id === "string" &&
        typeof (item as TrackedProp).subject === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Local store for props the user is tracking.
 *
 * Mock persistence for now: the shape matches what a `tracked_props` table
 * would return, so swapping the body for a Supabase query later does not
 * change a single call site.
 */
export function TrackedPropsProvider({ children }: { children: ReactNode }) {
  const [tracked, setTracked] = useState<TrackedProp[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tracked));
    } catch {
      // Non-fatal: tracking still works for this session.
    }
  }, [tracked]);

  const isTracked = useCallback(
    (id: string) => tracked.some((prop) => prop.id === id),
    [tracked],
  );

  const track = useCallback((prop: Omit<TrackedProp, "addedAt">) => {
    setTracked((prev) =>
      prev.some((p) => p.id === prop.id) ? prev : [{ ...prop, addedAt: Date.now() }, ...prev],
    );
  }, []);

  const untrack = useCallback((id: string) => {
    setTracked((prev) => prev.filter((prop) => prop.id !== id));
  }, []);

  const toggle = useCallback((prop: Omit<TrackedProp, "addedAt">) => {
    setTracked((prev) =>
      prev.some((p) => p.id === prop.id)
        ? prev.filter((p) => p.id !== prop.id)
        : [{ ...prop, addedAt: Date.now() }, ...prev],
    );
  }, []);

  const value = useMemo(
    () => ({ tracked, isTracked, track, untrack, toggle }),
    [tracked, isTracked, track, untrack, toggle],
  );

  return <TrackedPropsContext.Provider value={value}>{children}</TrackedPropsContext.Provider>;
}

export function useTrackedProps(): TrackedPropsValue {
  const ctx = useContext(TrackedPropsContext);
  if (!ctx) throw new Error("useTrackedProps must be used within a TrackedPropsProvider");
  return ctx;
}
