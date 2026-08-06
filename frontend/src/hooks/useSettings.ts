import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Theme } from "../context/ThemeContext";

export type OddsFormat = "american" | "decimal" | "fractional";
export type UnitMode = "percent" | "flat";
export type Currency = "USD" | "GBP" | "EUR" | "CAD" | "AUD";
export type Timeframe = "last5" | "last10" | "last20" | "season";

/** Mirrors atlas/schema_settings.sql -- keep the two in sync. Column names are
 *  snake_case because these objects go straight to and from Supabase. */
export interface UserSettings {
  theme: Theme;
  reduce_motion: boolean;
  odds_format: OddsFormat;
  show_implied: boolean;
  bankroll: number;
  unit_mode: UnitMode;
  unit_value: number;
  max_bet_units: number;
  currency: Currency;
  auto_track: boolean;
  compound_bankroll: boolean;
  weekly_loss_limit_units: number | null;
  default_sport: string | null;
  default_timeframe: Timeframe;
  hide_thin_samples: boolean;
}

/** Used before the row loads and for signed-out visitors. These match the
 *  column defaults in the schema; the database stays authoritative. */
export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  reduce_motion: false,
  odds_format: "american",
  show_implied: true,
  bankroll: 0,
  unit_mode: "percent",
  unit_value: 1,
  max_bet_units: 3,
  currency: "USD",
  auto_track: true,
  compound_bankroll: false,
  weekly_loss_limit_units: null,
  default_sport: null,
  default_timeframe: "last10",
  hide_thin_samples: false,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
};

const COLUMNS = Object.keys(DEFAULT_SETTINGS).join(", ");

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  // True only when a real row came back. `settings` holds DEFAULT_SETTINGS both
  // before the fetch and when there is nothing to fetch, and callers must be
  // able to tell those apart -- otherwise a default silently overwrites a
  // choice the user already made (e.g. their locally stored theme).
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Guards against a save that resolves after the component unmounts, and
  // against an in-flight load overwriting edits the user already made.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoaded(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    setError(null);

    supabase
      .from("user_settings")
      .select(COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          console.error("failed to load settings:", err.message);
          setError("Couldn't load your settings. Showing defaults.");
        } else if (data) {
          // Spread over the defaults so a column added to the schema after this
          // build shipped doesn't come through as undefined.
          setSettings({ ...DEFAULT_SETTINGS, ...(data as Partial<UserSettings>) });
          setLoaded(true);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  /** Update local state only. Nothing reaches the database until save() runs,
   *  so a half-typed bankroll never gets persisted. */
  const update = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError("You need to be signed in to save settings.");
      return false;
    }
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...settings }, { onConflict: "user_id" });

    if (!mounted.current) return !err;

    setSaving(false);
    if (err) {
      console.error("failed to save settings:", err.message);
      // The check constraints are the likely cause, and their raw text is not
      // something to put in front of a user.
      setError("Couldn't save. Check the values above and try again.");
      return false;
    }
    setSavedAt(Date.now());
    setLoaded(true);
    return true;
  }, [user, settings]);

  return { settings, update, save, loading, loaded, saving, error, savedAt };
}

/** Turns the stored bankroll settings into the numbers actually shown to the
 *  user. Pure, so the Settings preview and the unit calculator can't drift. */
export function bankrollMath(settings: UserSettings) {
  const { bankroll, unit_mode, unit_value, max_bet_units } = settings;
  const unit = unit_mode === "percent" ? bankroll * (unit_value / 100) : unit_value;
  const maxBet = unit * max_bet_units;
  const pctOfRoll = bankroll > 0 ? (unit / bankroll) * 100 : 0;
  const betsToRuin = unit > 0 ? Math.floor(bankroll / unit) : 0;

  const stance: "conservative" | "aggressive" | "very aggressive" =
    pctOfRoll <= 1.5 ? "conservative" : pctOfRoll <= 3 ? "aggressive" : "very aggressive";

  return { unit, maxBet, pctOfRoll, betsToRuin, stance };
}

export function formatMoney(value: number, currency: Currency): string {
  return (
    CURRENCY_SYMBOL[currency] + value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  );
}
