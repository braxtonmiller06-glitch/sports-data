import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "atlas.savedResearch";

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
}

const SavedResearchContext = createContext<SavedResearchValue | undefined>(undefined);

function readStored(): SavedResearchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

/**
 * Saved research opportunities.
 *
 * The single store behind "Add to research" everywhere in the app — Filter
 * Plays and Player Lookup both write here rather than keeping their own list,
 * so a saved row means the same thing wherever it came from. Same mock-then-
 * swap shape as `tracked-props`: the item matches what a `saved_research` table
 * would return, so moving to Supabase leaves every call site alone.
 */
export function SavedResearchProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedResearchItem[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Non-fatal: saving still works for this session.
    }
  }, [saved]);

  const isSaved = useCallback((id: string) => saved.some((item) => item.id === id), [saved]);

  const save = useCallback((item: Omit<SavedResearchItem, "savedAt">) => {
    setSaved((prev) =>
      // Deduped on id, so saving the same opportunity twice is a no-op rather
      // than a second row.
      prev.some((existing) => existing.id === item.id)
        ? prev
        : [{ ...item, savedAt: Date.now() }, ...prev],
    );
  }, []);

  const remove = useCallback((id: string) => {
    setSaved((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toggle = useCallback((item: Omit<SavedResearchItem, "savedAt">) => {
    setSaved((prev) =>
      prev.some((existing) => existing.id === item.id)
        ? prev.filter((existing) => existing.id !== item.id)
        : [{ ...item, savedAt: Date.now() }, ...prev],
    );
  }, []);

  const clear = useCallback(() => setSaved([]), []);

  const value = useMemo(
    () => ({ saved, isSaved, save, remove, toggle, clear }),
    [saved, isSaved, save, remove, toggle, clear],
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
