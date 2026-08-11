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
const ANON_KEY = "atlas.savedResearch";

function cacheKey(userId: string | null): string {
  return userId ? `${ANON_KEY}.${userId}` : ANON_KEY;
}

export interface SavedResearchItem {
  /** Stable across sessions: player + market + line + side. */
  id: string;
  playerId: string;
  playerName: string;
  sport: string;
  market: string;
  marketLabel: string;
  side: string;
  line: number;
  odds: string;
  /** The slate day this was saved from, ISO date. */
  date: string;
  /** Where it was saved from, so the research flow can group by origin. */
  source: "filter-plays" | "player-lookup";
  /** Deep link back into Player Lookup with this exact state restored. */
  href: string;
  savedAt: number;
}

interface SavedResearchValue {
  saved: SavedResearchItem[];
  isSaved: (id: string) => boolean;
  save: (item: Omit<SavedResearchItem, "savedAt">) => void;
  remove: (id: string) => void;
  toggle: (item: Omit<SavedResearchItem, "savedAt">) => void;
  clear: () => void;
  /** True while the first server read is in flight. */
  syncing: boolean;
}

const SavedResearchContext = createContext<SavedResearchValue | undefined>(undefined);

function readCache(key: string): SavedResearchItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Anything could be in localStorage. Keep only entries carrying the fields
    // the UI actually reads, rather than trusting it and rendering undefined.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedResearchItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SavedResearchItem).id === "string" &&
        typeof (item as SavedResearchItem).playerName === "string",
    );
  } catch {
    return [];
  }
}

function writeCache(key: string, value: SavedResearchItem[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode, or quota. In-memory state is still correct.
  }
}

interface Row {
  id: string;
  player_id: string;
  player_name: string;
  sport: string;
  market: string;
  market_label: string;
  side: string;
  line: number;
  odds: string | null;
  event_date: string | null;
  source: string;
  href: string;
  saved_at: string;
}

function rowToItem(row: Row): SavedResearchItem {
  return {
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    sport: row.sport,
    market: row.market,
    marketLabel: row.market_label,
    side: row.side,
    line: row.line,
    odds: row.odds ?? "",
    date: row.event_date ?? "",
    source: row.source === "player-lookup" ? "player-lookup" : "filter-plays",
    href: row.href,
    savedAt: new Date(row.saved_at).getTime(),
  };
}

function itemToRow(item: SavedResearchItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    player_id: item.playerId,
    player_name: item.playerName,
    sport: item.sport,
    market: item.market,
    market_label: item.marketLabel,
    side: item.side,
    line: item.line,
    odds: item.odds || null,
    event_date: item.date || null,
    source: item.source,
    href: item.href,
    saved_at: new Date(item.savedAt).toISOString(),
  };
}

/**
 * Saved research opportunities.
 *
 * The single store behind "Add to research" everywhere in the app — Filter
 * Plays and Player Lookup both write here rather than keeping their own list,
 * so a saved row means the same thing wherever it came from.
 *
 * Server-backed once signed in, with localStorage as a cache rather than the
 * record. Writes are optimistic and a failed server call leaves the local copy
 * alone: reverting the user's action because of a transient error loses more
 * than it protects, and the next sign-in reconciles from the cache.
 */
export function SavedResearchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [saved, setSaved] = useState<SavedResearchItem[]>(() => readCache(cacheKey(null)));
  const [syncing, setSyncing] = useState(false);
  const activeUser = useRef<string | null>(null);

  /**
   * Every state change goes through here, so the cache is written at the exact
   * points state legitimately changes. An effect mirroring `saved` fires on
   * mount with the empty initial state and would overwrite the signed-in
   * user's cache before the loader has read it.
   */
  const commit = useCallback(
    (next: SavedResearchItem[], forUser: string | null) => {
      setSaved(next);
      writeCache(cacheKey(forUser), next);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      activeUser.current = null;
      setSaved(readCache(cacheKey(null)));
      return;
    }

    activeUser.current = userId;
    setSyncing(true);
    // Seed from this user's cache immediately so the UI is correct on first
    // paint even if the server is slow or unreachable.
    setSaved(readCache(cacheKey(userId)));

    (async () => {
      // Best-effort throughout: an unreachable server or an unmigrated table
      // must fall back to the cache, never discard it.
      try {
        // Anything saved while signed out follows the user into their account,
        // once. The anonymous cache is cleared so it cannot be replayed into a
        // second account on a shared browser.
        const pending = readCache(ANON_KEY);
        if (pending.length > 0) {
          const { error } = await supabase
            .from("saved_research")
            .upsert(pending.map((i) => itemToRow(i, userId)), { onConflict: "user_id,id" });
          if (!error) {
            try {
              localStorage.removeItem(ANON_KEY);
            } catch {
              // Non-fatal: the upsert is idempotent.
            }
          }
        }

        const { data, error } = await supabase
          .from("saved_research")
          .select(
            "id, player_id, player_name, sport, market, market_label, side, line, odds, event_date, source, href, saved_at",
          )
          .order("saved_at", { ascending: false });

        if (cancelled || activeUser.current !== userId) return;

        if (error) throw new Error(error.message);
        commit(((data as Row[] | null) ?? []).map(rowToItem), userId);
      } catch (exc) {
        if (cancelled || activeUser.current !== userId) return;
        console.error(
          "failed to load saved research, using local cache:",
          exc instanceof Error ? exc.message : exc,
        );
        setSaved(readCache(cacheKey(userId)));
      } finally {
        if (!cancelled && activeUser.current === userId) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, commit]);

  const isSaved = useCallback((id: string) => saved.some((item) => item.id === id), [saved]);

  const push = useCallback(
    (item: SavedResearchItem) => {
      if (!userId) return;
      void supabase
        .from("saved_research")
        .upsert(itemToRow(item, userId), { onConflict: "user_id,id" })
        .then(({ error }) => {
          if (error) console.error("failed to save research:", error.message);
        });
    },
    [userId],
  );

  const removeRemote = useCallback(
    (id: string) => {
      if (!userId) return;
      void supabase
        .from("saved_research")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("failed to remove saved research:", error.message);
        });
    },
    [userId],
  );

  const save = useCallback(
    (item: Omit<SavedResearchItem, "savedAt">) => {
      // Deduped on id, so saving the same opportunity twice is a no-op.
      if (saved.some((existing) => existing.id === item.id)) return;
      const entry: SavedResearchItem = { ...item, savedAt: Date.now() };
      commit([entry, ...saved], userId);
      push(entry);
    },
    [saved, userId, commit, push],
  );

  const remove = useCallback(
    (id: string) => {
      commit(saved.filter((item) => item.id !== id), userId);
      removeRemote(id);
    },
    [saved, userId, commit, removeRemote],
  );

  const toggle = useCallback(
    (item: Omit<SavedResearchItem, "savedAt">) => {
      if (saved.some((existing) => existing.id === item.id)) {
        commit(saved.filter((existing) => existing.id !== item.id), userId);
        removeRemote(item.id);
        return;
      }
      const entry: SavedResearchItem = { ...item, savedAt: Date.now() };
      commit([entry, ...saved], userId);
      push(entry);
    },
    [saved, userId, commit, push, removeRemote],
  );

  const clear = useCallback(() => {
    const ids = saved.map((item) => item.id);
    commit([], userId);
    ids.forEach(removeRemote);
  }, [saved, userId, commit, removeRemote]);

  const value = useMemo(
    () => ({ saved, isSaved, save, remove, toggle, clear, syncing }),
    [saved, isSaved, save, remove, toggle, clear, syncing],
  );

  return (
    <SavedResearchContext.Provider value={value}>{children}</SavedResearchContext.Provider>
  );
}

export function useSavedResearch(): SavedResearchValue {
  const ctx = useContext(SavedResearchContext);
  if (!ctx) throw new Error("useSavedResearch must be used within a SavedResearchProvider");
  return ctx;
}
