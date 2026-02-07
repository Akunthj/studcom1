// src/lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Make Supabase optional - if env vars are not set, export null
// The app will work in local-first mode without Supabase
let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized successfully");
  } catch (error) {
    console.warn("Failed to initialize Supabase client:", error);
  }
} else {
  console.log("Supabase not configured - running in local-first mode");
}

// export the client for the rest of the app (can be null)
export const supabase = supabaseClient;
