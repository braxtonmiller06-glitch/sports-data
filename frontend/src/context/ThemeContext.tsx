import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Also read by the inline script in index.html, which runs before React mounts
 *  to stop the page flashing the wrong theme. Keep the two in sync. */
export const THEME_STORAGE_KEY = "atlas.theme";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Safari in private mode throws on localStorage access.
    return "system";
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

interface ThemeContextValue {
  /** What the user chose, including "system". */
  theme: Theme;
  /** What is actually on screen right now -- never "system". */
  resolved: ResolvedTheme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    theme === "system" ? systemTheme() : theme,
  );

  // Paint the current choice onto <html>, where the CSS token overrides hang.
  useEffect(() => {
    const next = theme === "system" ? systemTheme() : theme;
    setResolved(next);
    document.documentElement.setAttribute("data-theme", next);
  }, [theme]);

  // Keep "system" live. Without this the theme only tracks the OS at page load,
  // so a laptop switching to dark at sunset leaves the app in light mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia(LIGHT_QUERY);
    const onChange = () => {
      const next = systemTheme();
      setResolved(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the theme still applies for this session, it just won't
      // survive a reload. Not worth surfacing to the user.
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
