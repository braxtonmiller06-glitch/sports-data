import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud in dev, doesn't crash the whole app -- pages that need auth will
  // just fail their calls with a clear Supabase error instead.
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set -- copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
