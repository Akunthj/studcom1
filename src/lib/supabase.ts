// src/lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast with a clear message so you don't get cryptic "null.from" errors.
  throw new Error(
    "Missing Supabase env vars. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set."
  );
}

// export the client for the rest of the app
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// helpful runtime sanity log (remove in production)
console.log("Supabase client initialized:", !!supabase, {
  url: supabaseUrl ? "(present)" : "(missing)",
});
