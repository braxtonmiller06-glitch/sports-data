import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Pick } from "../types/pick";

interface PickRow {
  id: number;
  sport: string;
  subject: string;
  market_type: string;
  line: number | null;
  selection_side: string;
  decimal_odds: number;
  model_probability: number;
  market_probability: number;
  edge: number;
  confidence: number;
  verdict: string;
}

function rowToPick(row: PickRow): Pick {
  return {
    id: String(row.id),
    sport: row.sport,
    subject: row.subject,
    market_type: row.market_type,
    line: row.line,
    side: (row.selection_side ?? "").toUpperCase() as Pick["side"],
    decimal_odds: row.decimal_odds,
    model_probability: row.model_probability,
    market_probability: row.market_probability,
    edge: row.edge,
    confidence: row.confidence,
    verdict: row.verdict as Pick["verdict"],
  };
}

export function usePicks() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("picks")
      // `filters` is deliberately absent. The column is not granted to
      // `authenticated`, so naming it here does not return a partial row -- it
      // fails the whole request with a permission error, which took the
      // dashboard down for paid and free users alike. The breakdown is fetched
      // per pick through the pick_filters RPC instead.
      .select(
        "id, sport, subject, market_type, line, selection_side, decimal_odds, model_probability, market_probability, edge, confidence, verdict",
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          // `data` is null on some error-adjacent responses even when `error`
          // is unset (RLS returning nothing, an aborted request). Calling
          // .map on it blanks the dashboard with a runtime TypeError instead
          // of showing the empty state.
          setPicks(((data as PickRow[] | null) ?? []).map(rowToPick));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { picks, loading, error };
}
