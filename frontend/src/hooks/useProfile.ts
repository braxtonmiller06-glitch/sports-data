import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export interface Profile {
  id: string;
  email: string;
  subscription_status: "free" | "active" | "past_due" | "canceled";
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("id", user.id)
      // maybeSingle, not single: single() treats "no row" as an error, and a
      // user who signed up before the handle_new_user trigger existed has no
      // profile row. That is a missing row, not a failure, and logging it as
      // an error hides real ones.
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("failed to load profile:", error.message);
        }
        setProfile((data as Profile | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSubscribed = profile?.subscription_status === "active";
  return { profile, isSubscribed, loading };
}
