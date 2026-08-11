import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { useAuth } from "../context/AuthContext";

/** Anonymous cache. Cleared once its contents have been migrated to an account. */
const ANON_KEY = "atlas.trackedProps";

/** Per-user cache key, so two accounts on one browser never see each other's rows. */
function cacheKey(userId: string | null): string {
  return userId ? `${ANON_KEY}.${userId}` : ANON_KEY;
}

export interface TrackedProp {
  id: string;
  subject: string;
  market: string;
  addedAt: number;
  /**
   * Slate detail, carried when the caller has it. Optional so the fields could
   * be added without invalidating entries already in localStorage, and so the
   * dashboard's existing call sites stay unchanged.
   */
  sport?: string;
  line?: number;
  odds?: string;
  /** ISO date of the game this prop belongs to. */
  date?: string;
}

interface TrackedPropsValue {
  tracked: TrackedProp[];
  isTracked: (id: string) => boolean;
  track: (prop: Omit<TrackedProp, "addedAt">) => void;
  untrack: (id: string) => void;
  toggle: (prop: Omit<TrackedProp, "addedAt">) => void;
  /** True while the first server read is in flight. */
  syncing: boolean;
}

const TrackedPropsContext = createContext<TrackedPropsValue | undefined>(undefined);

function readCache(key: string): TrackedProp[] {
  try {
    const raw = localStorage.getItem(key);
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

function writeCache(key: string, value: TrackedProp[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, or quota. The in-memory state is still correct and the
    // server copy is the real record once signed in.
  }
}

interface Row {
  id: string;
  subject: string;
  market: string;
  sport: string | null;
  line: number | null;
  odds: string | null;
  event_date: string | null;
  added_at: string;
}

function rowToProp(row: Row): TrackedProp {
  return {
    id: row.id,
    subject: row.subject,
    market: row.market,
    addedAt: new Date(row.added_at).getTime(),
    sport: row.sport ?? undefined,
    line: row.line ?? undefined,
    odds: row.odds ?? undefined,
    date: row.event_date ?? undefined,
  };
}

function propToRow(prop: TrackedProp, userId: string) {
  return {
    id: prop.id,
    user_id: userId,
    subject: prop.subject,
    market: prop.market,
    sport: prop.sport ?? null,
    line: prop.line ?? null,
    odds: prop.odds ?? null,
    event_date: prop.date ?? null,
    added_at: new Date(prop.addedAt).toISOString(),
  };
}

/**
 * Props the user is tracking.
 *
 * Server-backed once signed in, with localStorage as a cache rather than the
 * record. It was the record until now, which made tracking per-device and
 * unrecoverable — the button said "Tracking" while the data lived in one
 * browser with no copy anywhere.
 *
 * Writes are optimistic: local state changes immediately and the server call
 * follows. A failed write leaves the local copy intact rather than reverting,
 * because losing the user's action to a transient network error is the worse
 * outcome, and the next sign-in reconciles from the cache.
 */
export function TrackedPropsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [tracked, setTracked] = useState<TrackedProp[]>(() => readCache(cacheKey(null)));
  const [syncing, setSyncing] = useState(false);
  const activeUser = useRef<string | null>(null);

  /**
   * Every state change goes through here so the cache is written at the exact
   * points state legitimately changes.
   *
   * An effect mirroring `tracked` cannot do this safely: on mount it fires with
   * the empty initial state and overwrites the signed-in user's cache before
   * the loader has read it. Gating that effect on a "hydrated" flag then
   * swallows genuine writes while a slow or failing server call is still in
   * flight. Writing explicitly has neither problem.
   */
  const commit = useCallback(
    (next: TrackedProp[], forUser: string | null) => {
      setTracked(next);
      writeCache(cacheKey(forUser), next);
    },
    [],
  );

  // Pull the account's rows on sign-in, migrating anything tracked while
  // signed out. The anonymous cache is cleared once migrated so it can never
  // be replayed into a second account on a shared browser.
  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      activeUser.current = null;
      setTracked(readCache(cacheKey(null)));
      return;
    }

    activeUser.current = userId;
    setSyncing(true);
    // Seed from this user's cache immediately so the UI is correct on the
    // first paint even if the server is slow or unreachable.
    setTracked(readCache(cacheKey(userId)));

    (async () => {
      // Everything here is best-effort. The store must survive an unreachable
      // server, a table that has not been migrated yet, and a client that
      // rejects rather than returning an error — in every case by falling back
      // to the cache, never by discarding it.
      try {
        const pending = readCache(ANON_KEY);
        if (pending.length > 0) {
          const { error } = await supabase
            .from("tracked_props")
            .upsert(pending.map((p) => propToRow(p, userId)), { onConflict: "user_id,id" });
          if (!error) {
            try {
              localStorage.removeItem(ANON_KEY);
            } catch {
              // Non-fatal: the upsert is idempotent, so a replay is harmless.
            }
          }
        }

        const { data, error } = await supabase
          .from("tracked_props")
          .select("id, subject, market, sport, line, odds, event_date, added_at")
          .order("added_at", { ascending: false });

        if (cancelled || activeUser.current !== userId) return;

        if (error) throw new Error(error.message);
        commit(((data as Row[] | null) ?? []).map(rowToProp), userId);
      } catch (exc) {
        if (cancelled || activeUser.current !== userId) return;
        console.error(
          "failed to load tracked props, using local cache:",
          exc instanceof Error ? exc.message : exc,
        );
        setTracked(readCache(cacheKey(userId)));
      } finally {
        if (!cancelled && activeUser.current === userId) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, commit]);

  const isTracked = useCallback(
    (id: string) => tracked.some((prop) => prop.id === id),
    [tracked],
  );

  const push = useCallback(
    (prop: TrackedProp) => {
      if (!userId) return;
      void supabase
        .from("tracked_props")
        .upsert(propToRow(prop, userId), { onConflict: "user_id,id" })
        .then(({ error }) => {
          if (error) console.error("failed to save tracked prop:", error.message);
        });
    },
    [userId],
  );

  const remove = useCallback(
    (id: string) => {
      if (!userId) return;
      void supabase
        .from("tracked_props")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("failed to remove tracked prop:", error.message);
        });
    },
    [userId],
  );

  const track = useCallback(
    (prop: Omit<TrackedProp, "addedAt">) => {
      if (tracked.some((p) => p.id === prop.id)) return;
      const entry: TrackedProp = { ...prop, addedAt: Date.now() };
      commit([entry, ...tracked], userId);
      push(entry);
    },
    [tracked, userId, commit, push],
  );

  const untrack = useCallback(
    (id: string) => {
      commit(tracked.filter((prop) => prop.id !== id), userId);
      remove(id);
    },
    [tracked, userId, commit, remove],
  );

  const toggle = useCallback(
    (prop: Omit<TrackedProp, "addedAt">) => {
      if (tracked.some((p) => p.id === prop.id)) {
        commit(tracked.filter((p) => p.id !== prop.id), userId);
        remove(prop.id);
        return;
      }
      const entry: TrackedProp = { ...prop, addedAt: Date.now() };
      commit([entry, ...tracked], userId);
      push(entry);
    },
    [tracked, userId, commit, push, remove],
  );

  const value = useMemo(
    () => ({ tracked, isTracked, track, untrack, toggle, syncing }),
    [tracked, isTracked, track, untrack, toggle, syncing],
  );

  return <TrackedPropsContext.Provider value={value}>{children}</TrackedPropsContext.Provider>;
}

export function useTrackedProps(): TrackedPropsValue {
  const ctx = useContext(TrackedPropsContext);
  if (!ctx) throw new Error("useTrackedProps must be used within a TrackedPropsProvider");
  return ctx;
}
