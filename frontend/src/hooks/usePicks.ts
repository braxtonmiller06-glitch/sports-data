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
  filters: Pick["filters"] | null;
}

function rowToPick(row: PickRow): Pick {
  return {
    id: String(row.id),
    sport: row.sport,
    subject: row.subject,
    market_type: row.market_type,
    line: row.line,
    side: row.selection_side.toUpperCase() as Pick["side"],
    decimal_odds: row.decimal_odds,
    model_probability: row.model_probability,
    market_probability: row.market_probability,
    edge: row.edge,
    confidence: row.confidence,
    verdict: row.verdict as Pick["verdict"],
    filters: row.filters ?? [],
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
      .select(
        "id, sport, subject, market_type, line, selection_side, decimal_odds, model_probability, market_probability, edge, confidence, verdict, filters",
      )
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
        } else {
          setPicks((data as PickRow[]).map(rowToPick));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { picks, loading, error };
}
